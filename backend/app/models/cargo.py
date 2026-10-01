from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from app.db import Base
import uuid

class Consignment(Base):
    __tablename__ = 'consignments'

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    station_id = Column(Integer, ForeignKey('stations.id'))
    version = Column(Integer, default=1)
    payload = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())
    updated_at = Column(DateTime(timezone=True), server_default=func.current_timestamp(), onupdate=func.current_timestamp())