from datetime import datetime, timezone
from app.models.incident import Incident
from app.models.incident_update import IncidentUpdate
from app.models.muster_entry import MusterEntry
from app.models.assistance_request import AssistanceRequest
from app.models.station_neighbour import StationNeighbour
from app.sync.registry import EntityHandler, register_handler


def parse_timestamp(value):
    if not value:
        return datetime.now(timezone.utc)
    if isinstance(value, datetime):
        return value
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except Exception:
        return datetime.now(timezone.utc)


@register_handler
class IncidentHandler(EntityHandler):
    entity_type = "incident"
    model = Incident
    permission_prefix = "sos"
    is_ledger = False

    def serialize(self, obj):
        data = super().serialize(obj)
        for date_col in [
            "raised_at", "acknowledged_at", "resolved_at",
            "cancel_requested_at", "cancel_confirmed_at",
            "created_at", "updated_at", "deleted_at"
        ]:
            val = data.get(date_col)
            if isinstance(val, datetime):
                data[date_col] = val.isoformat()
        return data

    def apply(self, db, user, operation, payload, base_version=1):
        entity_id = payload.get("id")

        if operation == "create":
            existing = db.query(Incident).filter(Incident.id == entity_id).first()
            if existing:
                # Idempotent upsert
                for field in [
                    "type", "severity", "status", "title", "description",
                    "location_text", "lat", "lon", "escalation_level",
                    "is_sos", "sos_category", "source", "reporter_personnel_id",
                    "people_affected", "details", "cancel_requested_at",
                    "cancel_requested_by", "cancel_requested_reason",
                    "cancel_confirmed_at", "cancel_confirmed_by",
                    "acknowledged_by", "acknowledged_at", "resolved_at"
                ]:
                    if field in payload:
                        val = payload[field]
                        if "at" in field and val:
                            val = parse_timestamp(val)
                        setattr(existing, field, val)
                return True

            incident = Incident(
                id=entity_id,
                station_id=payload.get("station_id", getattr(user, "station_id", None)),
                created_by=getattr(user, "id", None),
                type=payload.get("type", "UNSPEC"),
                severity=payload.get("severity", "critical" if payload.get("is_sos") else "medium"),
                status=payload.get("status", "raised"),
                title=payload.get("title", "SOS Emergency"),
                description=payload.get("description"),
                location_text=payload.get("location_text"),
                lat=payload.get("lat"),
                lon=payload.get("lon"),
                raised_at=parse_timestamp(payload.get("raised_at")),
                escalation_level=payload.get("escalation_level", 0),
                is_sos=payload.get("is_sos", False),
                sos_category=payload.get("sos_category"),
                source=payload.get("source", "manual"),
                reporter_personnel_id=payload.get("reporter_personnel_id"),
                people_affected=payload.get("people_affected"),
                details=payload.get("details"),
                cancel_requested_at=parse_timestamp(payload.get("cancel_requested_at")) if payload.get("cancel_requested_at") else None,
                cancel_requested_by=payload.get("cancel_requested_by"),
                cancel_requested_reason=payload.get("cancel_requested_reason"),
                cancel_confirmed_at=parse_timestamp(payload.get("cancel_confirmed_at")) if payload.get("cancel_confirmed_at") else None,
                cancel_confirmed_by=payload.get("cancel_confirmed_by"),
                acknowledged_by=payload.get("acknowledged_by"),
                acknowledged_at=parse_timestamp(payload.get("acknowledged_at")) if payload.get("acknowledged_at") else None,
                resolved_at=parse_timestamp(payload.get("resolved_at")) if payload.get("resolved_at") else None,
            )
            db.add(incident)
            return True

        if operation == "update":
            incident = db.query(Incident).filter(Incident.id == entity_id).first()
            if not incident:
                return False

            client_version = payload.get("base_version", base_version)
            if client_version != incident.version:
                return {
                    "success": False,
                    "conflict": True,
                    "record": self.serialize(incident),
                    "server_version": incident.version,
                }

            for field in [
                "type", "severity", "status", "title", "description",
                "location_text", "lat", "lon", "escalation_level",
                "is_sos", "sos_category", "source", "reporter_personnel_id",
                "people_affected", "details", "cancel_requested_at",
                "cancel_requested_by", "cancel_requested_reason",
                "cancel_confirmed_at", "cancel_confirmed_by",
                "acknowledged_by", "acknowledged_at", "resolved_at"
            ]:
                if field in payload:
                    val = payload[field]
                    if "at" in field and val:
                        val = parse_timestamp(val)
                    setattr(incident, field, val)

            return True

        if operation == "delete":
            incident = db.query(Incident).filter(Incident.id == entity_id).first()
            if incident:
                incident.deleted_at = datetime.now(timezone.utc)
            return True

        return False


@register_handler
class IncidentUpdateHandler(EntityHandler):
    entity_type = "incident_update"
    model = IncidentUpdate
    permission_prefix = "sos"
    is_ledger = True

    def serialize(self, obj):
        data = super().serialize(obj)
        for date_col in ["created_at", "updated_at", "deleted_at"]:
            val = data.get(date_col)
            if isinstance(val, datetime):
                data[date_col] = val.isoformat()
        return data

    def apply(self, db, user, operation, payload, base_version=1):
        entity_id = payload.get("id")
        if operation in ("create", "snapshot"):
            existing = db.query(IncidentUpdate).filter(IncidentUpdate.id == entity_id).first()
            if existing:
                return True
            update = IncidentUpdate(
                id=entity_id,
                incident_id=payload.get("incident_id"),
                user_id=payload.get("user_id", getattr(user, "id", None)),
                station_id=payload.get("station_id", getattr(user, "station_id", None)),
                note=payload.get("note"),
                status_change=payload.get("status_change"),
                kind=payload.get("kind", "note"),
            )
            db.add(update)
            return True
        return True


@register_handler
class MusterEntryHandler(EntityHandler):
    entity_type = "muster_entry"
    model = MusterEntry
    permission_prefix = "muster"
    is_ledger = False

    def serialize(self, obj):
        data = super().serialize(obj)
        for date_col in ["reported_at", "created_at", "updated_at", "deleted_at"]:
            val = data.get(date_col)
            if isinstance(val, datetime):
                data[date_col] = val.isoformat()
        return data

    def apply(self, db, user, operation, payload, base_version=1):
        entity_id = payload.get("id")
        existing = db.query(MusterEntry).filter(MusterEntry.id == entity_id).first()

        if operation in ("create", "update", "snapshot"):
            if existing:
                for field in ["status", "reported_by", "via"]:
                    if field in payload:
                        setattr(existing, field, payload[field])
                if payload.get("reported_at"):
                    existing.reported_at = parse_timestamp(payload["reported_at"])
                return True

            entry = MusterEntry(
                id=entity_id,
                incident_id=payload.get("incident_id"),
                personnel_id=payload.get("personnel_id"),
                user_id=payload.get("user_id"),
                station_id=payload.get("station_id", getattr(user, "station_id", None)),
                status=payload.get("status", "unaccounted"),
                reported_at=parse_timestamp(payload.get("reported_at")),
                reported_by=payload.get("reported_by", getattr(user, "id", None)),
                via=payload.get("via", "self"),
            )
            db.add(entry)
            return True

        if operation == "delete" and existing:
            existing.deleted_at = datetime.now(timezone.utc)
            return True

        return False


@register_handler
class AssistanceRequestHandler(EntityHandler):
    entity_type = "assistance_request"
    model = AssistanceRequest
    permission_prefix = "sos"
    is_ledger = False

    def serialize(self, obj):
        data = super().serialize(obj)
        for date_col in ["contacted_at", "responded_at", "completed_at", "created_at", "updated_at", "deleted_at"]:
            val = data.get(date_col)
            if isinstance(val, datetime):
                data[date_col] = val.isoformat()
        return data

    def apply(self, db, user, operation, payload, base_version=1):
        entity_id = payload.get("id")
        existing = db.query(AssistanceRequest).filter(AssistanceRequest.id == entity_id).first()

        if operation in ("create", "update", "snapshot"):
            if existing:
                for field in ["neighbour_id", "external_label", "channel", "status", "script_text", "note"]:
                    if field in payload:
                        setattr(existing, field, payload[field])
                for date_col in ["contacted_at", "responded_at", "completed_at"]:
                    if payload.get(date_col):
                        setattr(existing, date_col, parse_timestamp(payload[date_col]))
                return True

            req = AssistanceRequest(
                id=entity_id,
                incident_id=payload.get("incident_id"),
                neighbour_id=payload.get("neighbour_id"),
                external_label=payload.get("external_label"),
                station_id=payload.get("station_id", getattr(user, "station_id", None)),
                channel=payload.get("channel", "radio_vhf"),
                status=payload.get("status", "requested"),
                script_text=payload.get("script_text"),
                requested_by=payload.get("requested_by", getattr(user, "id", None)),
                contacted_at=parse_timestamp(payload.get("contacted_at")) if payload.get("contacted_at") else None,
                responded_at=parse_timestamp(payload.get("responded_at")) if payload.get("responded_at") else None,
                completed_at=parse_timestamp(payload.get("completed_at")) if payload.get("completed_at") else None,
                note=payload.get("note"),
            )
            db.add(req)
            return True

        if operation == "delete" and existing:
            existing.deleted_at = datetime.now(timezone.utc)
            return True

        return False


@register_handler
class StationNeighbourHandler(EntityHandler):
    entity_type = "station_neighbour"
    model = StationNeighbour
    permission_prefix = "station"
    is_ledger = False

    def serialize(self, obj):
        data = super().serialize(obj)
        for date_col in ["created_at", "updated_at", "deleted_at"]:
            val = data.get(date_col)
            if isinstance(val, datetime):
                data[date_col] = val.isoformat()
        return data

    def apply(self, db, user, operation, payload, base_version=1):
        entity_id = payload.get("id")
        existing = db.query(StationNeighbour).filter(StationNeighbour.id == entity_id).first()

        if operation in ("create", "update", "snapshot"):
            if existing:
                for field in ["name", "country", "distance_km", "distance_note", "services", "contact_channels", "is_sample", "notes"]:
                    if field in payload:
                        setattr(existing, field, payload[field])
                return True

            neighbour = StationNeighbour(
                id=entity_id,
                station_id=payload.get("station_id", getattr(user, "station_id", None)),
                name=payload.get("name"),
                country=payload.get("country", ""),
                distance_km=float(payload.get("distance_km", 0.0)),
                distance_note=payload.get("distance_note"),
                services=payload.get("services"),
                contact_channels=payload.get("contact_channels"),
                is_sample=payload.get("is_sample", True),
                notes=payload.get("notes"),
            )
            db.add(neighbour)
            return True

        if operation == "delete" and existing:
            existing.deleted_at = datetime.now(timezone.utc)
            return True

        return False