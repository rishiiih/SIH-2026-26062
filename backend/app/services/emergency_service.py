import uuid
from datetime import datetime, timezone
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from sqlalchemy.exc import SQLAlchemyError
from app.models.incident import Incident
from app.models.incident_update import IncidentUpdate
from app.models.alert import Alert
from app.services.audit_service import AuditService
from app.utils.scope import scope_query

ESCALATION_MINUTES = 10


class EmergencyService:

    @staticmethod
    def _parse_station_id(station_id_raw):
        if not station_id_raw or station_id_raw == "string":
            return None
        try:
            return int(station_id_raw)
        except (ValueError, TypeError):
            return None

    @staticmethod
    def ensure_sos_alert(db: Session, incident: Incident) -> None:
        """Ensures a critical alert exists for raised/acknowledged SOS or resolves it if resolved."""
        # Use a compact dedupe key or UUID subset to stay safely within VARCHAR(36) limits
        dedupe_key = f"sos-{incident.id[:18]}"
        existing_alert = db.query(Alert).filter(Alert.dedupe_key == dedupe_key).first()

        user_station = EmergencyService._parse_station_id(getattr(incident, "station_id", None))

        if incident.status in ["raised", "acknowledged", "responding"]:
            if not existing_alert:
                alert = Alert(
                    id=str(uuid.uuid4()),  # Exactly 36 characters (UUIDv4) - prevents truncation
                    type="sos",
                    severity="critical",
                    message=f"SOS Raised: {incident.title} ({incident.location_text or 'No location'})",
                    entity_type="incident",
                    entity_id=incident.id,
                    dedupe_key=dedupe_key,  # Fits comfortably within VARCHAR(36)
                    created_by=incident.created_by,
                    station_id=user_station,
                )
                db.add(alert)
                db.flush()
        elif incident.status == "resolved":
            if existing_alert and not existing_alert.resolved_at:
                existing_alert.resolved_at = datetime.now(timezone.utc)
                db.add(existing_alert)
                db.flush()

    @staticmethod
    def _compute_escalation_and_alerts(db: Session, incident: Incident) -> None:
        """Computes escalation level dynamically on read and keeps alert state synchronized."""
        if incident.status == "raised" and incident.raised_at:
            now = datetime.now(timezone.utc)
            raised = incident.raised_at
            if raised.tzinfo is None:
                raised = raised.replace(tzinfo=timezone.utc)
            
            elapsed_minutes = (now - raised).total_seconds() / 60.0
            new_level = int(elapsed_minutes // ESCALATION_MINUTES)
            if new_level != incident.escalation_level:
                incident.escalation_level = new_level
                db.add(incident)
                db.commit()

    @staticmethod
    def list_incidents(db: Session, user) -> List[Incident]:
        query = db.query(Incident)
        query = scope_query(query, Incident, user, "emergency:read")
        incidents = query.order_by(Incident.raised_at.desc()).all()
        
        for inc in incidents:
            EmergencyService._compute_escalation_and_alerts(db, inc)
        return incidents

    @staticmethod
    def create_incident(db, user, data: dict) -> Incident:
        now = datetime.now(timezone.utc)

        user_station = getattr(user, "station_id", None) if user else None
        station_id_raw = data.get("station_id") or user_station
        station_id = EmergencyService._parse_station_id(station_id_raw)

        # Always generate server-side UUID, never accept client ID/payload ID
        new_incident_id = str(uuid.uuid4())

        try:
            incident = Incident(
                id=new_incident_id,
                type=data.get("type", "other"),
                severity=data.get("severity", "critical"),
                status=data.get("status", "raised"),
                title=data.get("title", "Emergency Incident"),
                description=data.get("description"),
                location_text=data.get("location_text"),
                lat=data.get("lat"),
                lon=data.get("lon"),
                station_id=station_id,
                raised_at=data.get("raised_at") or now,
                created_by=str(user.id) if user and hasattr(user, "id") else data.get("created_by", "system"),
                escalation_level=0,
            )
            db.add(incident)
            db.flush()  # Flush to validate constraints without committing early

            # Create associated SOS alert atomically
            EmergencyService.ensure_sos_alert(db, incident)

            # Log audit entry using the correct local 'user' variable parameter
            AuditService.log(
                db=db,
                user=user,
                action="CREATE INCIDENT",
                entity_type="incident",
                entity_id=incident.id
            )

            # Single atomic commit at the very end
            db.commit()
            db.refresh(incident)
            return incident

        except SQLAlchemyError as e:
            db.rollback()  # Rollback transaction so no orphan rows are left behind
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database transaction failed: {str(e)}"
            )

    @staticmethod
    def get_incident_detail(db: Session, user, incident_id: str) -> Tuple[Incident, List[IncidentUpdate]]:
        query = db.query(Incident).filter(Incident.id == incident_id)
        query = scope_query(query, Incident, user, "emergency:read")
        incident = query.first()
        if not incident:
            raise HTTPException(status_code=404, detail="Incident not found")

        EmergencyService._compute_escalation_and_alerts(db, incident)
        updates = (
            db.query(IncidentUpdate)
            .filter(IncidentUpdate.incident_id == incident_id)
            .all()
        )
        return incident, updates

    @staticmethod
    def transition_incident(
        db: Session, user, incident_id: str, new_status: str, permission: str, note: Optional[str] = None
    ) -> Incident:
        query = db.query(Incident).filter(Incident.id == incident_id)
        query = scope_query(query, Incident, user, permission)
        incident = query.first()
        if not incident:
            raise HTTPException(status_code=404, detail="Incident not found")

        now = datetime.now(timezone.utc)
        user_station_raw = getattr(user, "station_id", None) or incident.station_id
        user_station = EmergencyService._parse_station_id(user_station_raw)

        incident.status = new_status
        if new_status == "acknowledged":
            incident.acknowledged_by = user.id
            incident.acknowledged_at = now
        elif new_status == "resolved":
            incident.resolved_at = now

        db.add(incident)

        update_record = IncidentUpdate(
            id=str(uuid.uuid4()),  # Ensure update ID is clean UUID
            incident_id=incident.id,
            user_id=user.id,
            note=note or f"Status changed to {new_status}",
            status_change=new_status,
            created_by=user.id,
            station_id=user_station,
        )
        db.add(update_record)
        db.commit()
        db.refresh(incident)

        EmergencyService.ensure_sos_alert(db, incident)
        AuditService.log(
            db,
            user=user,
            action=f"EMERGENCY_INCIDENT_{new_status.upper()}",
            entity_type="incident",
            entity_id=incident.id,
        )
        return incident