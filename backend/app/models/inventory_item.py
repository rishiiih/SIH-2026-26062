from sqlalchemy import Column, Float, String

from app.db import Base
from app.models.mixins import SyncMixin


class InventoryItem(SyncMixin, Base):
    __tablename__ = "inventory_items"

    name = Column(String(255), nullable=False)
    category = Column(String(30), nullable=False, index=True)
    unit = Column(String(50), nullable=False)
    reorder_level = Column(Float, nullable=True)
