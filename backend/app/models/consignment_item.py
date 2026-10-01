from sqlalchemy import Column, ForeignKey, Integer, String

from app.db import Base
from app.models.mixins import SyncMixin


class ConsignmentItem(SyncMixin, Base):
    __tablename__ = "consignment_items"

    consignment_id = Column(
        String(36),
        ForeignKey("consignments.id"),
        nullable=False,
        index=True,
    )
    description = Column(String(500), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit = Column(String(50), nullable=False)
    inventory_item_id = Column(
        String(36),
        ForeignKey("inventory_items.id"),
        nullable=True,
        index=True,
    )
