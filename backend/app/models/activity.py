"""Activity log model — tracks all user actions for the feed."""
from sqlalchemy import Column, Integer, String, Text, DateTime, JSON
from sqlalchemy.sql import func
from app.db import Base


class Activity(Base):
    __tablename__ = "activities"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    action = Column(String(50), nullable=False)  # created, completed, assigned, deleted, etc.
    entity_type = Column(String(50), nullable=False)  # task, goal, blueprint, etc.
    entity_id = Column(Integer, nullable=True)
    entity_title = Column(String(255), nullable=True)
    metadata_json = Column(JSON, nullable=True)  # extra context
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
