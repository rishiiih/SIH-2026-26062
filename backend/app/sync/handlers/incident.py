from datetime import datetime, timezone
from app.models.incident import Incident
from app.sync.registry import register_handler


def parse_timestamp(value):
    if not value:
        return datetime.now(timezone.utc)

    if isinstance(value, datetime):
        return value

    return datetime.fromisoformat(
        value.replace("Z", "+00:00")
    )


@register_handler("incident")
def handle_incident(
    db,
    user,
    operation,
    payload,
    base_version=1,
):
    entity_id = payload.get("id")

    # Robust station resolution: explicitly catch and reject "DEFAULT_STATION" strings or falsy values
    raw_station = payload.get("station_id") or getattr(user, "station_id", None)
    if not raw_station or raw_station == "DEFAULT_STATION":
        station_id = None
    else:
        try:
            station_id = int(raw_station)
        except (ValueError, TypeError):
            station_id = None

    if operation == "create":
        existing = (
            db.query(Incident)
            .filter(Incident.id == entity_id)
            .first()
        )

        if existing:
            return True

        incident = Incident(
            id=entity_id,
            station_id=station_id,  # Safely maps to integer or None
            created_by=str(user.id),
            type=payload.get("type", "other"),
            severity=payload.get("severity", "medium"),
            status=payload.get("status", "raised"),
            title=payload.get("title", ""),
            description=payload.get("description"),
            location_text=payload.get("location_text"),
            lat=payload.get("lat"),
            lon=payload.get("lon"),
            raised_at=parse_timestamp(
                payload.get("raised_at")
            ),
            escalation_level=payload.get(
                "escalation_level",
                0,
            ),
        )

        db.add(incident)
        return True

    if operation == "update":
        incident = (
            db.query(Incident)
            .filter(Incident.id == entity_id)
            .first()
        )

        if not incident:
            return False

        client_version = payload.get(
            "base_version",
            base_version,
        )

        current_version = getattr(incident, "version", 1)

        if client_version != current_version:
            return {
                "success": False,
                "conflict": True,
                "record": {
                    "id": incident.id,
                    "version": current_version,
                    "status": incident.status,
                    "title": incident.title,
                    "description": incident.description,
                },
                "server_version": current_version,
            }

        for field in (
            "type",
            "severity",
            "status",
            "title",
            "description",
            "location_text",
            "lat",
            "lon",
            "escalation_level",
        ):
            if field in payload:
                setattr(incident, field, payload[field])

        return True

    if operation == "delete":
        incident = (
            db.query(Incident)
            .filter(Incident.id == entity_id)
            .first()
        )

        if incident:
            incident.deleted_at = datetime.now(
                timezone.utc
            )

        return True

    return False


handle_incident.permission_prefix = "emergency"