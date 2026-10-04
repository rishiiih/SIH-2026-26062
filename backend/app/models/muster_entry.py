from sqlalchemy import Column, DateTime, ForeignKey, String
from sqlalchemy.sql import func

from app.db import Base
from app.models.mixins import SyncMixin


class MusterEntry(SyncMixin, Base):
    __tablename__ = "muster_entries"

    incident_id = Column(
        String(36),
        ForeignKey("incidents.id"),
        nullable=False,
        index=True,
    )
    personnel_id = Column(
        String(36),
        ForeignKey("personnel.id"),
        nullable=True,
        index=True,
    )
    user_id = Column(
        String(36),
        ForeignKey("users.id"),
        nullable=True,
        index=True,
    )
    status = Column(
        String(20),
        nullable=False,
        default="unaccounted",
        server_default="unaccounted",
        index=True,
    )  # safe | unaccounted | injured | away
    reported_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.current_timestamp(),
    )
    reported_by = Column(
        String(36),
        ForeignKey("users.id"),
        nullable=True,
    )
    via = Column(
        String(30),
        nullable=False,
        default="self",
        server_default="self",
    )  # self | leader | sensor
