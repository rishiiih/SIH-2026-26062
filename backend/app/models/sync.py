from sqlalchemy import Column, String, Integer, BigInteger, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from app.db import Base


class SyncCursor(Base):
    __tablename__ = "sync_cursors"

    id = Column(Integer, primary_key=True)
    user_id = Column(String(36), ForeignKey("users.id"), unique=True, nullable=False)
    last_pull_version = Column(BigInteger, default=0)
    last_device_id = Column(String(100))


class ChangeLog(Base):
    __tablename__ = "change_log"

    # Integer is required for SQLite autoincrement behavior.
    seq = Column(
        BigInteger().with_variant(Integer, "sqlite"),
        primary_key=True,
        autoincrement=True,
    )
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(String(36), nullable=False)
    station_id = Column(Integer, nullable=True)
    operation = Column(String(20), nullable=False)
    data = Column(JSON, nullable=True)
    serialized_data = Column(JSON, nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.current_timestamp(),
    )


class SyncReceipt(Base):
    __tablename__ = "sync_receipts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    idempotency_key = Column(String(100), unique=True, index=True, nullable=False)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    result = Column(JSON, nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.current_timestamp(),
    )