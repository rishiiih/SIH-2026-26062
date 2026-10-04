import uuid
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy.orm import Session

from app.models.incident import Incident
from app.models.incident_update import IncidentUpdate
from app.models.alert import Alert
from app.sos_config import UNACK_ESCALATION_S
from app.services.sos_event_bus import sos_event_bus
from app.services.audit_service import AuditService


def evaluate_sos_escalations(db: Session) -> List[dict]:
    """
    Evaluates all active, unacknowledged SOS incidents against escalation thresholds.
    Writes IncidentUpdate(kind='escalation'), keeps critical Alert, and publishes sos.escalated.
    """
    now = datetime.now(timezone.utc)
    active_sos = (
        db.query(Incident)
        .filter(
            Incident.is_sos.is_(True),
            Incident.status.notin_(["resolved", "cancelled"]),
        )
        .all()
    )

    escalations = []
    for inc in active_sos:
        # 1. Maintain or create dedupe_key "sos:<id>" critical alert
        alert = db.query(Alert).filter(Alert.dedupe_key == f"sos:{inc.id}").first()
        if not alert:
            alert = Alert(
                id=str(uuid.uuid4()),
                type="emergency",
                severity="critical",
                message=f"P0 SOS Emergency: {inc.title} ({inc.sos_category or inc.type})",
                entity_type="incident",
                entity_id=inc.id,
                station_id=inc.station_id,
                dedupe_key=f"sos:{inc.id}",
                created_by=inc.created_by,
            )
            db.add(alert)
        elif alert.resolved_at is not None:
            alert.resolved_at = None

        # 2. Check escalation timing for unacknowledged incidents
        if inc.acknowledged_at is None:
            raised_at = inc.raised_at
            if raised_at.tzinfo is None:
                raised_at = raised_at.replace(tzinfo=timezone.utc)

            elapsed = (now - raised_at).total_seconds()
            target_level = inc.escalation_level

            # Check thresholds [120, 300, 600]
            if len(UNACK_ESCALATION_S) >= 3:
                if elapsed >= UNACK_ESCALATION_S[2] and inc.escalation_level < 3:
                    target_level = 3
                elif elapsed >= UNACK_ESCALATION_S[1] and inc.escalation_level < 2:
                    target_level = 2
                elif elapsed >= UNACK_ESCALATION_S[0] and inc.escalation_level < 1:
                    target_level = 1

            if target_level > inc.escalation_level:
                inc.escalation_level = target_level
                update = IncidentUpdate(
                    id=str(uuid.uuid4()),
                    incident_id=inc.id,
                    user_id=inc.created_by or "system",
                    station_id=inc.station_id,
                    note=f"Automatic unacknowledged SOS escalation to Level {target_level} after {int(elapsed)}s",
                    kind="escalation",
                )
                db.add(update)
                alert.message = f"P0 SOS Escalation Level {target_level}: {inc.title}"

                AuditService.log_action(
                    db=db,
                    user=None,
                    user_id="system",
                    username="Auto-Escalation Engine",
                    station_id=inc.station_id,
                    action="sos:escalated",
                    entity_type="incident",
                    entity_id=inc.id,
                    details={"level": target_level, "elapsed_s": int(elapsed)},
                )

                sos_event_bus.publish(
                    "sos.escalated",
                    {
                        "incident_id": inc.id,
                        "escalation_level": target_level,
                        "elapsed_seconds": int(elapsed),
                        "station_id": inc.station_id,
                    },
                )
                escalations.append(
                    {"incident_id": inc.id, "level": target_level, "elapsed": elapsed}
                )

    db.commit()
    return escalations


def raise_sos_from_silence(db: Session, user, subject: str, station_id: Optional[int] = None, level: int = 1) -> Incident:
    """Auto-raise SOS from prolonged communication silence."""
    now = datetime.now(timezone.utc)
    incident_id = str(uuid.uuid4())
    inc = Incident(
        id=incident_id,
        station_id=station_id or getattr(user, "station_id", None),
        created_by=getattr(user, "id", None),
        type="FIELD",
        severity="critical",
        status="raised",
        title=f"AUTO-SOS: Comms Silence - {subject}",
        description="auto-raised, verify. Communication window exceeded.",
        location_text="Field Location (Last Known Check-in)",
        raised_at=now,
        is_sos=True,
        sos_category="FIELD",
        source="auto_silence",
        escalation_level=level,
    )
    db.add(inc)

    update = IncidentUpdate(
        id=str(uuid.uuid4()),
        incident_id=incident_id,
        user_id=getattr(user, "id", "system"),
        station_id=inc.station_id,
        note="Auto-raised from communication silence / overdue checkin",
        kind="escalation",
    )
    db.add(update)
    db.commit()

    sos_event_bus.publish(
        "sos.raised",
        {
            "id": inc.id,
            "title": inc.title,
            "category": inc.sos_category,
            "station_id": inc.station_id,
            "source": inc.source,
            "severity": inc.severity,
            "is_auto": True,
        },
    )
    return inc


def raise_sos_from_muster(db: Session, user, incident_id: str, unaccounted_names: List[str], station_id: Optional[int] = None) -> Incident:
    """Auto-raise Missing Person SOS when people remain unaccounted after muster timeout."""
    now = datetime.now(timezone.utc)
    new_inc_id = str(uuid.uuid4())
    names_str = ", ".join(unaccounted_names) if unaccounted_names else "Unspecified Personnel"

    inc = Incident(
        id=new_inc_id,
        station_id=station_id or getattr(user, "station_id", None),
        created_by=getattr(user, "id", None),
        type="MISSING",
        severity="critical",
        status="raised",
        title=f"AUTO-SOS: Missing Personnel after Muster ({len(unaccounted_names)})",
        description=f"auto-raised, verify. Unaccounted following incident {incident_id}: {names_str}",
        location_text="Station Compound / Muster Area",
        people_affected=len(unaccounted_names),
        raised_at=now,
        is_sos=True,
        sos_category="MISSING",
        source="auto_muster",
        escalation_level=1,
    )
    db.add(inc)

    update = IncidentUpdate(
        id=str(uuid.uuid4()),
        incident_id=new_inc_id,
        user_id=getattr(user, "id", "system"),
        station_id=inc.station_id,
        note=f"Auto-raised from muster timeout for incident {incident_id}. Missing: {names_str}",
        kind="muster",
    )
    db.add(update)
    db.commit()

    sos_event_bus.publish(
        "sos.raised",
        {
            "id": inc.id,
            "title": inc.title,
            "category": inc.sos_category,
            "station_id": inc.station_id,
            "source": inc.source,
            "severity": inc.severity,
            "is_auto": True,
        },
    )
    return inc
