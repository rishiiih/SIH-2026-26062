from sqlalchemy import Column, DateTime, String

from app.db import Base
from app.models.mixins import SyncMixin


class Alert(SyncMixin, Base):
    __tablename__ = "alerts"

    type = Column(String(30), nullable=False, index=True)
    severity = Column(String(20), nullable=False, index=True)
    message = Column(String(1000), nullable=False)
    entity_type = Column(String(50), nullable=True)
    entity_id = Column(String(36), nullable=True)
    dedupe_key = Column(String(255), unique=True, nullable=False, index=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
