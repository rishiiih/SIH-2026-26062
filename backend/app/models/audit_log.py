from app import db
import uuid

class AuditLog(db.Model):
    __tablename__ = 'audit_log'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'))
    username = db.Column(db.String(50), nullable=False)
    action = db.Column(db.String(50), nullable=False)
    entity_type = db.Column(db.String(50), nullable=False)
    entity_id = db.Column(db.String(100), nullable=False)
    before_data = db.Column(db.JSON)
    after_data = db.Column(db.JSON)
    device_timestamp = db.Column(db.DateTime(timezone=True))
    server_timestamp = db.Column(db.DateTime(timezone=True), default=db.func.current_timestamp())
    station_id = db.Column(db.Integer, db.ForeignKey('stations.id'))
    ip_address = db.Column(db.String(45))
    user_agent = db.Column(db.Text)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'username': self.username,
            'action': self.action,
            'entity_type': self.entity_type,
            'entity_id': self.entity_id,
            'before_data': self.before_data,
            'after_data': self.after_data,
            'device_timestamp': self.device_timestamp.isoformat() if self.device_timestamp else None,
            'server_timestamp': self.server_timestamp.isoformat() if self.server_timestamp else None,
            'station_id': self.station_id,
            'ip_address': self.ip_address,
            'user_agent': self.user_agent
        }
