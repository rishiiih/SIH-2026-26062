from sqlalchemy import Column, DateTime, ForeignKey, Float, String

from app.db import Base
from app.models.mixins import SyncMixin


class CheckIn(SyncMixin, Base):
    __tablename__ = "check_ins"

    personnel_id = Column(
        String(36),
        ForeignKey("personnel.id"),
        nullable=False,
        index=True,
    )
    status = Column(String(20), nullable=False, index=True)
    note = Column(String(500), nullable=True)
    location_text = Column(String(255), nullable=True)
    lat = Column(Float, nullable=True)
    lon = Column(Float, nullable=True)
    device_timestamp = Column(DateTime(timezone=True), nullable=True)
