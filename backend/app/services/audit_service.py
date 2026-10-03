from app.models.audit_log import AuditLog

class AuditService:
    @staticmethod
    def log(db, user, action, entity_type, entity_id, before_data=None, after_data=None, device_timestamp=None):
        """
        Renamed to 'log' to match the call in emergency_service.py.
        Takes 'db' as a parameter because FastAPI injects the database session.
        """
        audit_entry = AuditLog(
            user_id=user.id,
            username=user.username,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            before_data=before_data,
            after_data=after_data,
            device_timestamp=device_timestamp,
            station_id=getattr(user, 'station_id', None),
            # FastAPI does not have a global request object like Flask. 
            # We set these to None to prevent crashes.
            ip_address=None,
            user_agent=None
        )
        # Use the passed FastAPI db session instead of Flask's db.session
        db.add(audit_entry)
        db.commit()
        return audit_entry

    @staticmethod
    def get_audit_log(db, user_id=None, entity_type=None, entity_id=None, station_id=None, limit=100):
        # Updated to use the FastAPI db session
        query = db.query(AuditLog)

        if user_id:
            query = query.filter(AuditLog.user_id == user_id)
        if entity_type:
            query = query.filter(AuditLog.entity_type == entity_type)
        if entity_id:
            query = query.filter(AuditLog.entity_id == entity_id)
        if station_id:
            query = query.filter(AuditLog.station_id == station_id)

        return query.order_by(AuditLog.server_timestamp.desc()).limit(limit).all()