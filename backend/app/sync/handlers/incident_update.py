import uuid
from app.models.incident import Incident
from app.models.incident_update import IncidentUpdate
from app.sync.registry import register_handler


@register_handler("incident_update")
def handle_incident_update(
    db,
    user,
    operation,
    payload,
    base_version=1,
):
    incident_id = payload.get("incident_id") or payload.get("id")

    if not incident_id:
        return False

    if operation in ("create", "update"):
        incident = db.query(Incident).filter(Incident.id == incident_id).first()
        if not incident:
            return False

        # Robust station resolution: reject "DEFAULT_STATION" strings and convert to None
        raw_station = payload.get("station_id") or getattr(user, "station_id", None) or getattr(incident, "station_id", None)
        if not raw_station or raw_station == "DEFAULT_STATION":
            station_id = None
        else:
            try:
                station_id = int(raw_station)
            except (ValueError, TypeError):
                station_id = None

        status_to = payload.get("status_change") or payload.get("status_to")
        if status_to:
            incident.status = status_to

        update_record = IncidentUpdate(
            id=payload.get("id") or f"upd-{str(uuid.uuid4())}",
            incident_id=incident.id,
            user_id=str(user.id),
            note=payload.get("note", f"Status updated to {status_to}"),
            status_change=status_to,
            created_by=str(user.id),
            station_id=station_id,  # Safely maps to integer or None
        )
        db.add(update_record)
        return True

    return False


handle_incident_update.permission_prefix = "emergency"