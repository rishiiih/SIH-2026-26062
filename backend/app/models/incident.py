from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, JSON, String

from app.db import Base
from app.models.mixins import SyncMixin


class Incident(SyncMixin, Base):
    __tablename__ = "incidents"

    type = Column(String(30), nullable=False, index=True)
    severity = Column(String(20), nullable=False, index=True)
    status = Column(String(20), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(String(2000), nullable=True)
    location_text = Column(String(255), nullable=True)
    lat = Column(Float, nullable=True)
    lon = Column(Float, nullable=True)
    raised_at = Column(DateTime(timezone=True), nullable=False)
    acknowledged_by = Column(
        String(36),
        ForeignKey("users.id"),
        nullable=True,
    )
    acknowledged_at = Column(DateTime(timezone=True), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    escalation_level = Column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
    )

    # SOS additions
    is_sos = Column(Boolean, default=False, nullable=False, server_default="0", index=True)
    sos_category = Column(String(30), nullable=True, index=True)
    source = Column(
        String(30),
        nullable=False,
        default="manual",
        server_default="manual",
    )
    reporter_personnel_id = Column(
        String(36),
        ForeignKey("personnel.id"),
        nullable=True,
    )
    people_affected = Column(Integer, nullable=True)
    details = Column(JSON, nullable=True)
    cancel_requested_at = Column(DateTime(timezone=True), nullable=True)
    cancel_requested_by = Column(
        String(36),
        ForeignKey("users.id"),
        nullable=True,
    )
    cancel_requested_reason = Column(String(500), nullable=True)
    cancel_confirmed_at = Column(DateTime(timezone=True), nullable=True)
    cancel_confirmed_by = Column(
        String(36),
        ForeignKey("users.id"),
        nullable=True,
    )

