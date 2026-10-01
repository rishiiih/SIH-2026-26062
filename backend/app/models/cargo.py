from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.db import Base

from app.models.consignment import Consignment


class CustodyLog(Base):
    __tablename__ = 'custody_logs'

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    consignment_id = Column(String(36), ForeignKey('consignments.id'), nullable=False)
    action = Column(String(50), nullable=False) # e.g., 'packed', 'dispatched', 'received'
    performed_by = Column(String(36), ForeignKey('users.id'), nullable=False)
    station_id = Column(Integer, ForeignKey('stations.id'))
    notes = Column(String(255))
    timestamp = Column(DateTime(timezone=True), server_default=func.current_timestamp())
    
    # We will use this later to cryptographically verify offline handoffs between devices
    signature_hash = Column(String(255))