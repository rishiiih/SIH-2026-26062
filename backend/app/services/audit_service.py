from datetime import datetime, timezone
from app.models.audit_log import AuditLog

try:
    from app.db import SessionLocal
except ImportError:
    SessionLocal = None


class AuditService:
    @staticmethod
    def log_action(
        user=None,
        action=None,
        entity_type="incident",
        entity_id="unknown",
        before_data=None,
        after_data=None,
        device_timestamp=None,
        db=None,
        ip_address=None,
        user_agent=None,
        **kwargs,
    ):
        # Support kwargs-heavy calls
        if not user and "user" in kwargs:
            user = kwargs["user"]
        if not action and "action" in kwargs:
            action = kwargs["action"]
        if "details" in kwargs and after_data is None:
            after_data = kwargs["details"]
        if "entity_type" in kwargs:
            entity_type = kwargs["entity_type"]
        if "entity_id" in kwargs:
            entity_id = kwargs["entity_id"]
        if "device_timestamp" in kwargs and device_timestamp is None:
            device_timestamp = kwargs["device_timestamp"]

        user_id = getattr(user, "id", None) if user else kwargs.get("user_id", "system")
        username = getattr(user, "username", None) if user else kwargs.get("username", "system")
        station_id = getattr(user, "station_id", None) if user else kwargs.get("station_id")

        if isinstance(device_timestamp, str):
            try:
                device_timestamp = datetime.fromisoformat(device_timestamp.replace("Z", "+00:00"))
            except Exception:
                device_timestamp = datetime.now(timezone.utc)

        audit_entry = AuditLog(
            user_id=str(user_id) if user_id else None,
            username=str(username or "unknown"),
            action=str(action or "unknown"),
            entity_type=str(entity_type or "incident"),
            entity_id=str(entity_id or "unknown"),
            before_data=before_data,
            after_data=after_data,
            device_timestamp=device_timestamp,
            station_id=station_id,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        close_session = False
        session = db
        if session is None and SessionLocal is not None:
            try:
                session = SessionLocal()
                close_session = True
            except Exception:
                session = None

        if session is not None:
            try:
                session.add(audit_entry)
                if close_session:
                    session.commit()
                else:
                    session.flush()
            except Exception:
                if close_session:
                    session.rollback()
            finally:
                if close_session:
                    session.close()


        return audit_entry

    @staticmethod
    def get_audit_log(db=None, user_id=None, entity_type=None, entity_id=None, station_id=None, limit=100):
        close_session = False
        session = db
        if session is None and SessionLocal is not None:
            session = SessionLocal()
            close_session = True

        if session is None:
            return []

        try:
            query = session.query(AuditLog)
            if user_id:
                query = query.filter(AuditLog.user_id == user_id)
            if entity_type:
                query = query.filter(AuditLog.entity_type == entity_type)
            if entity_id:
                query = query.filter(AuditLog.entity_id == entity_id)
            if station_id:
                query = query.filter(AuditLog.station_id == station_id)
            return query.order_by(AuditLog.server_timestamp.desc()).limit(limit).all()
        finally:
            if close_session:
                session.close()
