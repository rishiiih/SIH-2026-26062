import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, event
from sqlalchemy.sql import func

from app.db import Base


class SyncMixin:
    id = Column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    version = Column(Integer, nullable=False, default=1, server_default="1")
    station_id = Column(
        Integer,
        ForeignKey("stations.id"),
        nullable=True,
        index=True,
    )
    created_by = Column(
        String(36),
        ForeignKey("users.id"),
        nullable=True,
        index=True,
    )
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.current_timestamp(),
    )
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
    )
    deleted_at = Column(DateTime(timezone=True), nullable=True)


@event.listens_for(Base, "before_update", propagate=True)
def increment_sync_version(mapper, connection, target):
    if isinstance(target, SyncMixin):
        target.version = (target.version or 1) + 1
