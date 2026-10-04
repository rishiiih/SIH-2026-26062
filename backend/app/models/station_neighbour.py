from sqlalchemy import Boolean, Column, Float, JSON, String, Text

from app.db import Base
from app.models.mixins import SyncMixin


class StationNeighbour(SyncMixin, Base):
    __tablename__ = "station_neighbours"

    name = Column(String(100), nullable=False, index=True)
    country = Column(String(50), nullable=False)
    distance_km = Column(Float, nullable=False)
    distance_note = Column(String(100), nullable=True)
    services = Column(JSON, nullable=True)
    contact_channels = Column(JSON, nullable=True)
    is_sample = Column(Boolean, default=True, nullable=False, server_default="1")
    notes = Column(Text, nullable=True)
