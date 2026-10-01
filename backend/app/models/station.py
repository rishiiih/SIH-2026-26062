from sqlalchemy import Column, String, Integer, Numeric, Boolean, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db import Base

class Station(Base):
    __tablename__ = 'stations'

    id = Column(Integer, primary_key=True)
    name = Column(String(100), unique=True, nullable=False)
    code = Column(String(10), unique=True, nullable=False)
    location = Column(String(100), nullable=False)
    latitude = Column(Numeric(9, 6), nullable=False)
    longitude = Column(Numeric(9, 6), nullable=False)
    region = Column(String(20), nullable=False)
    timezone = Column(String(50), nullable=False)
    is_active = Column(Boolean, default=True)
    next_resupply_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())

    users = relationship('User', back_populates='station')