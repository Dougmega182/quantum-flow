"""TeamMember model — team collaboration for workload intelligence."""
from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.sql import func
from app.db import Base


class TeamMember(Base):
    __tablename__ = "team_members"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    role = Column(String(100), nullable=True)
    capacity_hours_per_day = Column(Float, nullable=False, server_default="8.0")
    avatar_url = Column(String(512), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
