from sqlalchemy import Column, ForeignKey, String

from app.db import Base
from app.models.mixins import SyncMixin


class IncidentUpdate(SyncMixin, Base):
    __tablename__ = "incident_updates"

    incident_id = Column(
        String(36),
        ForeignKey("incidents.id"),
        nullable=False,
        index=True,
    )
    user_id = Column(
        String(36),
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )
    note = Column(String(1000), nullable=True)
    status_change = Column(String(30), nullable=True)
    kind = Column(String(30), nullable=False, default="note", server_default="note", index=True)
