"""EnergyProfile model — stores learned hourly productivity scores per user."""
from sqlalchemy import Column, Integer, Float, DateTime
from sqlalchemy.sql import func
from app.db import Base


class EnergyProfile(Base):
    __tablename__ = "energy_profiles"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    hour = Column(Integer, nullable=False)  # 0-23
    productivity_score = Column(Float, nullable=False, default=0.0)
    sample_count = Column(Integer, nullable=False, default=0)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
