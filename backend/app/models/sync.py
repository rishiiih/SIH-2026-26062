from sqlalchemy import Column, String, Integer, BigInteger, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.db import Base

class SyncCursor(Base):
    __tablename__ = 'sync_cursors'

    id = Column(Integer, primary_key=True)
    user_id = Column(String(36), ForeignKey('users.id'), unique=True, nullable=False)
    last_pull_version = Column(BigInteger, default=0)
    last_device_id = Column(String(100))

class ChangeLog(Base):
    __tablename__ = 'change_log'

    seq = Column(BigInteger, primary_key=True, autoincrement=True)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(String(36), nullable=False)
    station_id = Column(Integer)
    operation = Column(String(20), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())