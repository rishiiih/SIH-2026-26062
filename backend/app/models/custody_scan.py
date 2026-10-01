from sqlalchemy import Column, DateTime, ForeignKey, String

from app.db import Base
from app.models.mixins import SyncMixin


class CustodyScan(SyncMixin, Base):
    __tablename__ = "custody_scans"

    consignment_id = Column(
        String(36),
        ForeignKey("consignments.id"),
        nullable=False,
        index=True,
    )
    scanned_by = Column(
        String(36),
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )
    scan_type = Column(String(20), nullable=False, index=True)
    location_text = Column(String(255), nullable=True)
    note = Column(String(500), nullable=True)
    device_timestamp = Column(DateTime(timezone=True), nullable=True)
