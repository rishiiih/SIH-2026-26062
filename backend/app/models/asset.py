from sqlalchemy import Column, DateTime, ForeignKey, String

from app.db import Base
from app.models.mixins import SyncMixin


class Asset(SyncMixin, Base):
    __tablename__ = "assets"

    asset_number = Column(String(100), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    category = Column(String(30), nullable=False, index=True)
    status = Column(String(20), nullable=False, index=True)
    condition_note = Column(String(500), nullable=True)
    last_maintenance_at = Column(DateTime(timezone=True), nullable=True)
    next_maintenance_due = Column(DateTime(timezone=True), nullable=True)
    assigned_to_user_id = Column(
        String(36),
        ForeignKey("users.id"),
        nullable=True,
        index=True,
    )
