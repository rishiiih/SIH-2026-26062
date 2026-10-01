from sqlalchemy import Column, DateTime, ForeignKey, String

from app.db import Base
from app.models.mixins import SyncMixin


class MaintenanceRecord(SyncMixin, Base):
    __tablename__ = "maintenance_records"

    asset_id = Column(
        String(36),
        ForeignKey("assets.id"),
        nullable=False,
        index=True,
    )
    performed_by = Column(
        String(36),
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )
    performed_at = Column(DateTime(timezone=True), nullable=False)
    notes = Column(String(1000), nullable=True)
    next_due = Column(DateTime(timezone=True), nullable=True)
