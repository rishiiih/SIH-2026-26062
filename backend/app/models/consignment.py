from sqlalchemy import Boolean, Column, DateTime, Float, Integer, JSON, String

from app.db import Base
from app.models.mixins import SyncMixin


class Consignment(SyncMixin, Base):
    __tablename__ = "consignments"

    consignment_number = Column(String(100), unique=True, nullable=True, index=True)
    tracking_number = Column(String(100), nullable=True, index=True)
    description = Column(String(500), nullable=True)
    origin_station_id = Column(Integer, nullable=True, index=True)
    destination_station_id = Column(Integer, nullable=True, index=True)
    status = Column(String(30), nullable=True, index=True)
    priority = Column(String(2), nullable=True, index=True)
    mode = Column(String(20), nullable=True)
    weight_kg = Column(Float, nullable=True)
    volume_m3 = Column(Float, nullable=True)
    is_hazardous = Column(Boolean, nullable=False, default=False, server_default="false")
    is_fragile = Column(Boolean, nullable=False, default=False, server_default="false")
    cold_chain = Column(Boolean, nullable=False, default=False, server_default="false")
    planned_departure = Column(DateTime(timezone=True), nullable=True)
    eta = Column(DateTime(timezone=True), nullable=True)
    received_at = Column(DateTime(timezone=True), nullable=True)
    payload = Column(JSON, nullable=True)
