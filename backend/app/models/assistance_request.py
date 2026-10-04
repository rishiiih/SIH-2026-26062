from sqlalchemy import Column, DateTime, ForeignKey, String, Text

from app.db import Base
from app.models.mixins import SyncMixin


class AssistanceRequest(SyncMixin, Base):
    __tablename__ = "assistance_requests"

    incident_id = Column(
        String(36),
        ForeignKey("incidents.id"),
        nullable=False,
        index=True,
    )
    neighbour_id = Column(
        String(36),
        nullable=True,
        index=True,
    )
    external_label = Column(
        String(100),
        nullable=True,
    )
    channel = Column(
        String(50),
        nullable=False,
        default="radio_vhf",
    )  # radio_vhf | radio_hf | satellite_phone | email | in_person
    status = Column(
        String(30),
        nullable=False,
        default="requested",
        server_default="requested",
        index=True,
    )  # requested | contacted | accepted | declined | en_route | completed | no_response
    script_text = Column(Text, nullable=True)
    requested_by = Column(
        String(36),
        ForeignKey("users.id"),
        nullable=False,
    )
    contacted_at = Column(DateTime(timezone=True), nullable=True)
    responded_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    note = Column(Text, nullable=True)
