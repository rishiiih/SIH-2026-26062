import uuid
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, JSON, Text
from sqlalchemy.sql import func
from app.db import Base

class AuditLog(Base):
    __tablename__ = 'audit_log'

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey('users.id'))
    username = Column(String(50), nullable=False)
    action = Column(String(50), nullable=False)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(String(100), nullable=False)
    before_data = Column(JSON)
    after_data = Column(JSON)
    device_timestamp = Column(DateTime(timezone=True))
    server_timestamp = Column(DateTime(timezone=True), server_default=func.current_timestamp())
    station_id = Column(Integer, ForeignKey('stations.id'))
    ip_address = Column(String(45))
    user_agent = Column(Text)

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