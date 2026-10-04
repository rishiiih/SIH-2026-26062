from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db import get_db
from app.security import get_current_user
from app.services.emergency_service import EmergencyService

router = APIRouter(prefix="/api/incidents", tags=["emergency"])


class IncidentCreateSchema(BaseModel):
    id: Optional[str] = None
    type: str = "other"
    severity: str = "critical"
    title: str
    description: Optional[str] = None
    location_text: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None
    station_id: Optional[str] = None


class ActionNoteSchema(BaseModel):
    note: Optional[str] = None


@router.get("", response_model=List[dict])
def list_incidents(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    incidents = EmergencyService.list_incidents(db, current_user)
    return [
        {
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
        }
        for inc in incidents
    ]


@router.post("", status_code=status.HTTP_201_CREATED)
def create_incident(
    payload: IncidentCreateSchema,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    incident = EmergencyService.create_incident(db, current_user, payload.model_dump())
    return {"status": "created", "id": incident.id}


@router.get("/{incident_id}")
def get_incident_detail(
    incident_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    incident, updates = EmergencyService.get_incident_detail(db, current_user, incident_id)
    return {
        "incident": {
            "id": incident.id,
            "type": incident.type,
            "severity": incident.severity,
            "status": incident.status,
            "title": incident.title,
            "description": incident.description,
            "location_text": incident.location_text,
            "escalation_level": incident.escalation_level,
            "raised_at": incident.raised_at.isoformat() if incident.raised_at else None,
        },
        "updates": [
            {
                "id": u.id,
                "user_id": u.user_id,
                "note": u.note,
                "status_change": u.status_change,
                "created_at": u.created_at.isoformat() if getattr(u, "created_at", None) else None,
            }
            for u in updates
        ],
    }


@router.post("/{incident_id}/acknowledge")
def acknowledge_incident(
    incident_id: str,
    payload: Optional[ActionNoteSchema] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    note = payload.note if payload else "Incident acknowledged"
    incident = EmergencyService.transition_incident(
        db, current_user, incident_id, "acknowledged", "emergency:acknowledge", note
    )
    return {"status": "acknowledged", "id": incident.id}


@router.post("/{incident_id}/respond")
def respond_incident(
    incident_id: str,
    payload: Optional[ActionNoteSchema] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    note = payload.note if payload else "Response unit deployed"
    incident = EmergencyService.transition_incident(
        db, current_user, incident_id, "responding", "emergency:respond", note
    )
    return {"status": "responding", "id": incident.id}


@router.post("/{incident_id}/resolve")
def resolve_incident(
    incident_id: str,
    payload: Optional[ActionNoteSchema] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    note = payload.note if payload else "Incident resolved"
    incident = EmergencyService.transition_incident(
        db, current_user, incident_id, "resolved", "emergency:resolve", note
    )
    return {"status": "resolved", "id": incident.id}
