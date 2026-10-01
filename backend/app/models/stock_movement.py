from sqlalchemy import Column, DateTime, Float, ForeignKey, String

from app.db import Base
from app.models.mixins import SyncMixin


class StockMovement(SyncMixin, Base):
    __tablename__ = "stock_movements"

    item_id = Column(
        String(36),
        ForeignKey("inventory_items.id"),
        nullable=False,
        index=True,
    )
    movement_type = Column(String(20), nullable=False, index=True)
    quantity = Column(Float, nullable=False)
    reference_type = Column(String(50), nullable=True)
    reference_id = Column(String(36), nullable=True)
    note = Column(String(500), nullable=True)
    device_timestamp = Column(DateTime(timezone=True), nullable=True)
