import json
import os
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.incident import Incident
from app.models.incident_update import IncidentUpdate
from app.models.alert import Alert
from app.models.muster_entry import MusterEntry
from app.models.assistance_request import AssistanceRequest
from app.models.station_neighbour import StationNeighbour
from app.models.user import User
from app.models.sync import ChangeLog
from app.security import get_current_user, get_sos_user
from app.services.audit_service import AuditService
from app.services.permission_service import PermissionService
from app.services.sos_escalation import evaluate_sos_escalations
from app.services.sos_event_bus import sos_event_bus
from app.sos_config import BEACON_MAX_BYTES
from app.utils.scope import scope_query

router = APIRouter(tags=["Emergency & SOS"])


# --- Schemas ---

class BeaconPayload(BaseModel):
    id: str
    type: str = "UNSPEC"
    device_timestamp: Optional[str] = None
    station_id: Optional[int] = None
    user_id: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None
    people_count: Optional[int] = None
    flags: Optional[int] = 0


class DetailsPayload(BaseModel):
    details: Optional[Dict[str, Any]] = None
    people_affected: Optional[int] = None
    location_text: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None


class RespondPayload(BaseModel):
    note: Optional[str] = None


class CancelRequestPayload(BaseModel):
    reason: str


class CancelConfirmPayload(BaseModel):
    note: Optional[str] = None


class ResolvePayload(BaseModel):
    note: str


class EscalatePayload(BaseModel):
    level: int
    note: Optional[str] = None


class MusterReportPayload(BaseModel):
    status: str = "safe"  # safe | unaccounted | injured | away
    personnel_id: Optional[str] = None
    via: Optional[str] = "self"


class MusterMarkPayload(BaseModel):
    personnel_id: Optional[str] = None
    user_id: Optional[str] = None
    status: str = "safe"
    via: Optional[str] = "leader"


class AidRequestCreatePayload(BaseModel):
    neighbour_id: Optional[str] = None
    external_label: Optional[str] = None
    channel: str = "radio_vhf"
    script_text: Optional[str] = None
    note: Optional[str] = None


class AidRequestStatusPayload(BaseModel):
    status: str  # requested | contacted | accepted | declined | en_route | completed | no_response
    note: Optional[str] = None


def parse_timestamp(value):
    if not value:
        return datetime.now(timezone.utc)
    if isinstance(value, datetime):
        return value
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except Exception:
        return datetime.now(timezone.utc)


def format_incident(inc: Incident) -> dict:
    return {
        "id": inc.id,
        "type": inc.type,
        "severity": inc.severity,
        "status": inc.status,
        "title": inc.title,
        "description": inc.description,
        "location_text": inc.location_text,
        "lat": inc.lat,
        "lon": inc.lon,
        "station_id": inc.station_id,
        "raised_at": inc.raised_at.isoformat() if inc.raised_at else None,
        "acknowledged_by": inc.acknowledged_by,
        "acknowledged_at": inc.acknowledged_at.isoformat() if inc.acknowledged_at else None,
        "resolved_at": inc.resolved_at.isoformat() if inc.resolved_at else None,
        "escalation_level": inc.escalation_level,
        "is_sos": inc.is_sos,
        "sos_category": inc.sos_category,
        "source": inc.source,
        "reporter_personnel_id": inc.reporter_personnel_id,
        "people_affected": inc.people_affected,
        "details": inc.details,
        "cancel_requested_at": inc.cancel_requested_at.isoformat() if inc.cancel_requested_at else None,
        "cancel_requested_by": inc.cancel_requested_by,
        "cancel_requested_reason": inc.cancel_requested_reason,
        "cancel_confirmed_at": inc.cancel_confirmed_at.isoformat() if inc.cancel_confirmed_at else None,
        "cancel_confirmed_by": inc.cancel_confirmed_by,
        "version": inc.version,
        "created_by": inc.created_by,
        "created_at": inc.created_at.isoformat() if inc.created_at else None,
        "updated_at": inc.updated_at.isoformat() if inc.updated_at else None,
    }


# --- Endpoints ---

@router.post("/api/sos/beacon")
async def post_sos_beacon(
    request: Request,
    payload: BeaconPayload,
    db: Session = Depends(get_db),
    user: User = Depends(get_sos_user),
):
    """
    Compact beacon receiver (<= 256 bytes payload).
    Supports token expired up to 30 days. Idempotent upsert by id.
    """
    raw_body = await request.body()
    if len(raw_body) > BEACON_MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Beacon payload exceeds maximum size of {BEACON_MAX_BYTES} bytes (received {len(raw_body)})",
        )

    # Scoping check: Field users can only raise at own station
    target_station_id = payload.station_id or user.station_id
    if not PermissionService.has_permission(user, "sos:raise", target_station_id=target_station_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied to raise SOS at this station",
        )

    now = datetime.now(timezone.utc)
    server_mode = "station" if os.environ.get("STATION_MODE") == "true" else "central"

    # Check if expired token was used and log
    if getattr(user, "_token_was_expired", False):
        AuditService.log_action(
            db=db,
            user=user,
            action="sos:beacon_expired_token_used",
            entity_type="incident",
            entity_id=payload.id,
            details={"beacon_id": payload.id, "server": server_mode},
        )

    existing = db.query(Incident).filter(Incident.id == payload.id).first()
    if not existing:
        inc = Incident(
            id=payload.id,
            station_id=target_station_id,
            created_by=user.id,
            type=payload.type or "UNSPEC",
            severity="critical",
            status="raised",
            title=f"SOS: {payload.type or 'EMERGENCY'}",
            description="Emergency SOS beacon received",
            lat=payload.lat,
            lon=payload.lon,
            raised_at=parse_timestamp(payload.device_timestamp),
            escalation_level=0,
            is_sos=True,
            sos_category=payload.type or "UNSPEC",
            source="manual",
            people_affected=payload.people_count,
        )
        db.add(inc)

        # First update record
        update = IncidentUpdate(
            id=str(uuid.uuid4()),
            incident_id=inc.id,
            user_id=user.id,
            station_id=inc.station_id,
            note="Beacon transmission registered on station/central gateway",
            kind="note",
        )
        db.add(update)

        # Ensure dedupe Alert is kept
        alert = db.query(Alert).filter(Alert.dedupe_key == f"sos:{inc.id}").first()
        if not alert:
            alert = Alert(
                id=str(uuid.uuid4()),
                type="emergency",
                severity="critical",
                message=f"P0 SOS Emergency: {inc.title} ({inc.sos_category})",
                entity_type="incident",
                entity_id=inc.id,
                station_id=inc.station_id,
                dedupe_key=f"sos:{inc.id}",
                created_by=user.id,
            )
            db.add(alert)

        # Record into ChangeLog for sync
        db.add(
            ChangeLog(
                entity_type="incident",
                entity_id=str(inc.id),
                station_id=inc.station_id,
                operation="create",
                data=format_incident(inc),
                serialized_data=format_incident(inc),
            )
        )

        AuditService.log_action(
            db=db,
            user=user,
            action="sos:raise",
            entity_type="incident",
            entity_id=inc.id,
            details={"type": payload.type, "station_id": target_station_id, "server": server_mode},
        )
        db.commit()

        sos_event_bus.publish(
            "sos.raised",
            {
                "id": inc.id,
                "title": inc.title,
                "category": inc.sos_category,
                "station_id": inc.station_id,
                "raised_at": inc.raised_at.isoformat(),
                "created_by": user.id,
                "server": server_mode,
            },
        )
    else:
        # Idempotent arrival - update coords or counts if provided
        if payload.lat is not None:
            existing.lat = payload.lat
        if payload.lon is not None:
            existing.lon = payload.lon
        if payload.people_count is not None:
            existing.people_affected = payload.people_count
        db.commit()

    return {
        "id": payload.id,
        "received_at": now.isoformat(),
        "server": server_mode,
    }


@router.post("/api/sos/{id}/details")
def post_sos_details(
    id: str,
    payload: DetailsPayload,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    inc = db.query(Incident).filter(Incident.id == id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    if not PermissionService.has_permission(user, "sos:respond", target_station_id=inc.station_id):
        raise HTTPException(status_code=403, detail="Permission denied")

    if payload.details is not None:
        inc.details = {**(inc.details or {}), **payload.details}
    if payload.people_affected is not None:
        inc.people_affected = payload.people_affected
    if payload.location_text:
        inc.location_text = payload.location_text
    if payload.title:
        inc.title = payload.title
    if payload.description:
        inc.description = payload.description

    update = IncidentUpdate(
        id=str(uuid.uuid4()),
        incident_id=inc.id,
        user_id=user.id,
        station_id=inc.station_id,
        note="Emergency incident details and quick-fields updated",
        kind="note",
    )
    db.add(update)
    db.commit()

    sos_event_bus.publish(
        "sos.updated",
        {"incident_id": inc.id, "details": inc.details, "station_id": inc.station_id},
    )
    return {"status": "ok", "incident": format_incident(inc)}


@router.post("/api/sos/{id}/ack")
def post_sos_ack(
    id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    inc = db.query(Incident).filter(Incident.id == id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    if not PermissionService.has_permission(user, "sos:acknowledge", target_station_id=inc.station_id):
        raise HTTPException(status_code=403, detail="Permission denied to acknowledge SOS")

    now = datetime.now(timezone.utc)
    inc.acknowledged_by = user.id
    inc.acknowledged_at = now

    update = IncidentUpdate(
        id=str(uuid.uuid4()),
        incident_id=inc.id,
        user_id=user.id,
        station_id=inc.station_id,
        note=f"SOS Acknowledged by {user.full_name or user.username}",
        kind="ack",
    )
    db.add(update)

    AuditService.log_action(
        db=db,
        user=user,
        action="sos:acknowledge",
        entity_type="incident",
        entity_id=inc.id,
        details={"acknowledged_by": user.username, "acknowledged_at": now.isoformat()},
    )
    db.commit()

    sos_event_bus.publish(
        "sos.ack",
        {
            "incident_id": inc.id,
            "acknowledged_by": user.full_name or user.username,
            "acknowledged_at": now.isoformat(),
            "station_id": inc.station_id,
        },
    )
    return {"status": "ok", "incident": format_incident(inc)}


@router.post("/api/sos/{id}/respond")
def post_sos_respond(
    id: str,
    payload: RespondPayload,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    inc = db.query(Incident).filter(Incident.id == id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    if not PermissionService.has_permission(user, "sos:respond", target_station_id=inc.station_id):
        raise HTTPException(status_code=403, detail="Permission denied to respond to SOS")

    note_text = payload.note or f"{user.full_name or user.username} responding to emergency scene"
    update = IncidentUpdate(
        id=str(uuid.uuid4()),
        incident_id=inc.id,
        user_id=user.id,
        station_id=inc.station_id,
        note=note_text,
        kind="respond",
    )
    db.add(update)

    AuditService.log_action(
        db=db,
        user=user,
        action="sos:respond",
        entity_type="incident",
        entity_id=inc.id,
        details={"responder": user.username, "note": note_text},
    )
    db.commit()

    sos_event_bus.publish(
        "sos.updated",
        {"incident_id": inc.id, "kind": "respond", "responder": user.username, "note": note_text},
    )
    return {"status": "ok", "incident": format_incident(inc)}


@router.post("/api/sos/{id}/cancel-request")
def post_sos_cancel_request(
    id: str,
    payload: CancelRequestPayload,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    inc = db.query(Incident).filter(Incident.id == id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    now = datetime.now(timezone.utc)
    inc.cancel_requested_at = now
    inc.cancel_requested_by = user.id
    inc.cancel_requested_reason = payload.reason

    update = IncidentUpdate(
        id=str(uuid.uuid4()),
        incident_id=inc.id,
        user_id=user.id,
        station_id=inc.station_id,
        note=f"False alarm cancel request submitted: {payload.reason}",
        kind="cancel_request",
    )
    db.add(update)

    AuditService.log_action(
        db=db,
        user=user,
        action="sos:cancel_requested",
        entity_type="incident",
        entity_id=inc.id,
        details={"reason": payload.reason},
    )
    db.commit()

    sos_event_bus.publish(
        "sos.updated",
        {"incident_id": inc.id, "kind": "cancel_request", "reason": payload.reason},
    )
    return {"status": "ok", "incident": format_incident(inc)}


@router.post("/api/sos/{id}/cancel-confirm")
def post_sos_cancel_confirm(
    id: str,
    payload: CancelConfirmPayload,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    inc = db.query(Incident).filter(Incident.id == id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    if not PermissionService.has_permission(user, "sos:cancel_confirm", target_station_id=inc.station_id):
        raise HTTPException(status_code=403, detail="Permission denied to confirm cancellation (leaders/command only)")

    now = datetime.now(timezone.utc)
    inc.cancel_confirmed_at = now
    inc.cancel_confirmed_by = user.id
    inc.status = "cancelled"

    update = IncidentUpdate(
        id=str(uuid.uuid4()),
        incident_id=inc.id,
        user_id=user.id,
        station_id=inc.station_id,
        note=f"SOS Cancellation confirmed by {user.username}. {payload.note or ''}".strip(),
        kind="cancel_confirm",
        status_change="cancelled",
    )
    db.add(update)

    alert = db.query(Alert).filter(Alert.dedupe_key == f"sos:{inc.id}").first()
    if alert:
        alert.resolved_at = now

    AuditService.log_action(
        db=db,
        user=user,
        action="sos:cancel_confirm",
        entity_type="incident",
        entity_id=inc.id,
        details={"confirmed_by": user.username, "note": payload.note},
    )
    db.commit()

    sos_event_bus.publish(
        "sos.resolved",
        {"incident_id": inc.id, "status": "cancelled", "confirmed_by": user.username},
    )
    return {"status": "ok", "incident": format_incident(inc)}


@router.post("/api/sos/{id}/resolve")
def post_sos_resolve(
    id: str,
    payload: ResolvePayload,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    inc = db.query(Incident).filter(Incident.id == id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    if not PermissionService.has_permission(user, "sos:resolve", target_station_id=inc.station_id):
        raise HTTPException(status_code=403, detail="Permission denied to resolve SOS")

    if not payload.note or not payload.note.strip():
        raise HTTPException(status_code=400, detail="Resolution note is mandatory")

    now = datetime.now(timezone.utc)
    inc.status = "resolved"
    inc.resolved_at = now

    update = IncidentUpdate(
        id=str(uuid.uuid4()),
        incident_id=inc.id,
        user_id=user.id,
        station_id=inc.station_id,
        note=f"SOS Resolved: {payload.note.strip()}",
        status_change="resolved",
        kind="status",
    )
    db.add(update)

    alert = db.query(Alert).filter(Alert.dedupe_key == f"sos:{inc.id}").first()
    if alert:
        alert.resolved_at = now

    AuditService.log_action(
        db=db,
        user=user,
        action="sos:resolve",
        entity_type="incident",
        entity_id=inc.id,
        details={"resolved_by": user.username, "resolution_note": payload.note},
    )
    db.commit()

    sos_event_bus.publish(
        "sos.resolved",
        {"incident_id": inc.id, "status": "resolved", "resolved_by": user.username},
    )
    return {"status": "ok", "incident": format_incident(inc)}


@router.post("/api/sos/{id}/escalate")
def post_sos_escalate(
    id: str,
    payload: EscalatePayload,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    inc = db.query(Incident).filter(Incident.id == id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    inc.escalation_level = payload.level
    update = IncidentUpdate(
        id=str(uuid.uuid4()),
        incident_id=inc.id,
        user_id=user.id,
        station_id=inc.station_id,
        note=f"SOS Manually Escalated to Level {payload.level}. {payload.note or ''}".strip(),
        kind="escalation",
    )
    db.add(update)

    AuditService.log_action(
        db=db,
        user=user,
        action="sos:escalated",
        entity_type="incident",
        entity_id=inc.id,
        details={"level": payload.level, "note": payload.note},
    )
    db.commit()

    sos_event_bus.publish(
        "sos.escalated",
        {"incident_id": inc.id, "escalation_level": payload.level, "station_id": inc.station_id},
    )
    return {"status": "ok", "incident": format_incident(inc)}


@router.get("/api/sos/active")
def get_sos_active(
    since: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Active SOS incidents with evaluation on read and polling fallback."""
    evaluate_sos_escalations(db)

    query = db.query(Incident).filter(
        Incident.is_sos.is_(True),
        Incident.status.notin_(["resolved", "cancelled"]),
    )

    query = scope_query(query, Incident, user, "sos:read")

    if since:
        since_dt = parse_timestamp(since)
        query = query.filter(Incident.updated_at >= since_dt)

    incidents = query.order_by(Incident.raised_at.desc()).all()
    return {"incidents": [format_incident(inc) for inc in incidents]}


@router.get("/api/incidents")
def get_all_incidents(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Standard emergency incident list compatible with legacy dashboard."""
    query = db.query(Incident)
    query = scope_query(query, Incident, user, "emergency:read")
    incidents = query.order_by(Incident.raised_at.desc()).limit(100).all()
    return {"incidents": [format_incident(inc) for inc in incidents]}


@router.get("/api/sos/stream")
async def get_sos_stream(
    request: Request,
    last_event_id: Optional[str] = Header(None, alias="Last-Event-ID"),
    max_events: Optional[int] = Query(None),
    user: User = Depends(get_sos_user),
):
    """
    Server-Sent Events endpoint with 5s keepalive heartbeats and Last-Event-ID resume.
    """
    return StreamingResponse(
        sos_event_bus.stream_events(last_event_id=last_event_id, max_events=max_events),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )



@router.get("/api/sos/{id}")
def get_sos_detail(
    id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    inc = db.query(Incident).filter(Incident.id == id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    updates = (
        db.query(IncidentUpdate)
        .filter(IncidentUpdate.incident_id == id)
        .order_by(IncidentUpdate.created_at.asc())
        .all()
    )

    muster_entries = (
        db.query(MusterEntry)
        .filter(MusterEntry.incident_id == id)
        .order_by(MusterEntry.reported_at.asc())
        .all()
    )

    aid_requests = (
        db.query(AssistanceRequest)
        .filter(AssistanceRequest.incident_id == id)
        .order_by(AssistanceRequest.created_at.asc())
        .all()
    )

    return {
        "incident": format_incident(inc),
        "updates": [
            {
                "id": u.id,
                "user_id": u.user_id,
                "note": u.note,
                "status_change": u.status_change,
                "kind": u.kind,
                "created_at": u.created_at.isoformat() if u.created_at else None,
            }
            for u in updates
        ],
        "muster": [
            {
                "id": m.id,
                "personnel_id": m.personnel_id,
                "user_id": m.user_id,
                "status": m.status,
                "reported_at": m.reported_at.isoformat() if m.reported_at else None,
                "reported_by": m.reported_by,
                "via": m.via,
            }
            for m in muster_entries
        ],
        "aid_requests": [
            {
                "id": a.id,
                "neighbour_id": a.neighbour_id,
                "external_label": a.external_label,
                "channel": a.channel,
                "status": a.status,
                "script_text": a.script_text,
                "requested_by": a.requested_by,
                "contacted_at": a.contacted_at.isoformat() if a.contacted_at else None,
                "responded_at": a.responded_at.isoformat() if a.responded_at else None,
                "completed_at": a.completed_at.isoformat() if a.completed_at else None,
                "note": a.note,
            }
            for a in aid_requests
        ],
    }


@router.post("/api/sos/{id}/muster/report")
def post_muster_report(
    id: str,
    payload: MusterReportPayload,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    inc = db.query(Incident).filter(Incident.id == id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    existing = (
        db.query(MusterEntry)
        .filter(
            MusterEntry.incident_id == id,
            (MusterEntry.user_id == user.id)
            | (MusterEntry.personnel_id == payload.personnel_id if payload.personnel_id else False),
        )
        .first()
    )

    now = datetime.now(timezone.utc)
    if existing:
        existing.status = payload.status
        existing.reported_at = now
        existing.reported_by = user.id
        existing.via = payload.via or "self"
        entry = existing
    else:
        entry = MusterEntry(
            id=str(uuid.uuid4()),
            incident_id=id,
            personnel_id=payload.personnel_id,
            user_id=user.id,
            station_id=inc.station_id,
            status=payload.status,
            reported_at=now,
            reported_by=user.id,
            via=payload.via or "self",
        )
        db.add(entry)

    update = IncidentUpdate(
        id=str(uuid.uuid4()),
        incident_id=id,
        user_id=user.id,
        station_id=inc.station_id,
        note=f"Muster status reported: {payload.status} by {user.username}",
        kind="muster",
    )
    db.add(update)
    db.commit()

    sos_event_bus.publish(
        "muster.updated",
        {"incident_id": id, "user_id": user.id, "status": payload.status},
    )
    return {"status": "ok", "entry_id": entry.id}


@router.post("/api/sos/{id}/muster/mark")
def post_muster_mark(
    id: str,
    payload: MusterMarkPayload,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    inc = db.query(Incident).filter(Incident.id == id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    if not PermissionService.has_permission(user, "muster:manage", target_station_id=inc.station_id):
        raise HTTPException(status_code=403, detail="Permission denied to manage muster")

    now = datetime.now(timezone.utc)
    entry = MusterEntry(
        id=str(uuid.uuid4()),
        incident_id=id,
        personnel_id=payload.personnel_id,
        user_id=payload.user_id,
        station_id=inc.station_id,
        status=payload.status,
        reported_at=now,
        reported_by=user.id,
        via=payload.via or "leader",
    )
    db.add(entry)

    update = IncidentUpdate(
        id=str(uuid.uuid4()),
        incident_id=id,
        user_id=user.id,
        station_id=inc.station_id,
        note=f"Muster marked {payload.status} for personnel {payload.personnel_id or payload.user_id} by {user.username}",
        kind="muster",
    )
    db.add(update)
    db.commit()

    sos_event_bus.publish(
        "muster.updated",
        {"incident_id": id, "marked_by": user.username, "status": payload.status},
    )
    return {"status": "ok", "entry_id": entry.id}


@router.post("/api/sos/{id}/aid-requests")
def post_aid_request(
    id: str,
    payload: AidRequestCreatePayload,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    inc = db.query(Incident).filter(Incident.id == id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    if not PermissionService.has_permission(user, "sos:mutual_aid", target_station_id=inc.station_id):
        raise HTTPException(status_code=403, detail="Permission denied to request mutual aid")

    req = AssistanceRequest(
        id=str(uuid.uuid4()),
        incident_id=id,
        neighbour_id=payload.neighbour_id,
        external_label=payload.external_label,
        station_id=inc.station_id,
        channel=payload.channel,
        status="requested",
        script_text=payload.script_text,
        requested_by=user.id,
        note=payload.note,
    )
    db.add(req)

    update = IncidentUpdate(
        id=str(uuid.uuid4()),
        incident_id=id,
        user_id=user.id,
        station_id=inc.station_id,
        note=f"Mutual aid assistance requested from {payload.external_label or payload.neighbour_id} via {payload.channel}",
        kind="aid_request",
    )
    db.add(update)

    AuditService.log_action(
        db=db,
        user=user,
        action="sos:mutual_aid",
        entity_type="assistance_request",
        entity_id=req.id,
        details={"incident_id": id, "channel": payload.channel, "target": payload.external_label or payload.neighbour_id},
    )
    db.commit()

    sos_event_bus.publish(
        "aid.updated",
        {"incident_id": id, "aid_id": req.id, "status": req.status},
    )
    return {"status": "ok", "request_id": req.id}


@router.patch("/api/sos/{id}/aid-requests/{aid_id}/status")
def patch_aid_request_status(
    id: str,
    aid_id: str,
    payload: AidRequestStatusPayload,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    req = db.query(AssistanceRequest).filter(AssistanceRequest.id == aid_id, AssistanceRequest.incident_id == id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Assistance request not found")

    if not PermissionService.has_permission(user, "sos:mutual_aid", target_station_id=req.station_id):
        raise HTTPException(status_code=403, detail="Permission denied to update mutual aid request")

    now = datetime.now(timezone.utc)
    req.status = payload.status
    if payload.note:
        req.note = payload.note

    if payload.status == "contacted":
        req.contacted_at = now
    elif payload.status in ("accepted", "declined"):
        req.responded_at = now
    elif payload.status == "completed":
        req.completed_at = now

    update = IncidentUpdate(
        id=str(uuid.uuid4()),
        incident_id=id,
        user_id=user.id,
        station_id=req.station_id,
        note=f"Mutual aid request {aid_id} status updated to {payload.status}. {payload.note or ''}".strip(),
        kind="aid_request",
    )
    db.add(update)

    AuditService.log_action(
        db=db,
        user=user,
        action="sos:mutual_aid_status_change",
        entity_type="assistance_request",
        entity_id=req.id,
        details={"status": payload.status, "note": payload.note},
    )
    db.commit()

    sos_event_bus.publish(
        "aid.updated",
        {"incident_id": id, "aid_id": req.id, "status": req.status},
    )
    return {"status": "ok", "status_current": req.status}


@router.get("/api/stations/{id}/neighbours")
def get_station_neighbours(
    id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Retrieve neighbouring stations for mutual aid coordination."""
    neighbours = (
        db.query(StationNeighbour)
        .filter(StationNeighbour.station_id == id)
        .order_by(StationNeighbour.distance_km.asc())
        .all()
    )
    return {
        "station_id": id,
        "neighbours": [
            {
                "id": n.id,
                "name": n.name,
                "country": n.country,
                "distance_km": n.distance_km,
                "distance_note": n.distance_note,
                "services": n.services,
                "contact_channels": n.contact_channels,
                "is_sample": n.is_sample,
                "notes": n.notes,
            }
            for n in neighbours
        ],
    }

