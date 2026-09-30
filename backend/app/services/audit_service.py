from app import db
from app.models.audit_log import AuditLog
from flask import request

class AuditService:
    @staticmethod
    def log_action(user, action, entity_type, entity_id, before_data=None, after_data=None, device_timestamp=None):
        audit_entry = AuditLog(
            user_id=user.id,
            username=user.username,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            before_data=before_data,
            after_data=after_data,
            device_timestamp=device_timestamp,
            station_id=user.station_id,
            ip_address=request.remote_addr if request else None,
            user_agent=request.headers.get('User-Agent') if request else None
        )
        db.session.add(audit_entry)
        db.session.commit()
        return audit_entry

    @staticmethod
    def get_audit_log(user_id=None, entity_type=None, entity_id=None, station_id=None, limit=100):
        query = AuditLog.query

        if user_id:
            query = query.filter_by(user_id=user_id)
        if entity_type:
            query = query.filter_by(entity_type=entity_type)
        if entity_id:
            query = query.filter_by(entity_id=entity_id)
        if station_id:
            query = query.filter_by(station_id=station_id)

        return query.order_by(AuditLog.server_timestamp.desc()).limit(limit).all()
