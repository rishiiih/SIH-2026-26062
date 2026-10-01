from sqlalchemy import Column, Date, ForeignKey, Integer, String

from app.db import Base
from app.models.mixins import SyncMixin


class Personnel(SyncMixin, Base):
    __tablename__ = "personnel"

    user_id = Column(
        String(36),
        ForeignKey("users.id"),
        nullable=True,
        index=True,
    )
    full_name = Column(String(255), nullable=False)
    role_title = Column(String(100), nullable=False)
    current_station_id = Column(
        Integer,
        ForeignKey("stations.id"),
        nullable=True,
        index=True,
    )
    status = Column(String(20), nullable=False, index=True)
    radio_callsign = Column(String(100), nullable=True)
    medical_clearance_expires_on = Column(Date, nullable=True)
    checkin_interval_hours = Column(Integer, nullable=True)
