"""Notification model — in-app notification center."""
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.db import Base


class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    type = Column(String(50), nullable=False)  # overdue, streak, digest, assignment, blueprint, system
    title = Column(String(255), nullable=False)
    body = Column(Text, nullable=True)
    read = Column(Boolean, nullable=False, server_default="false")
    task_id = Column(Integer, nullable=True)  # optional reference
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
