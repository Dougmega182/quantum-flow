from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector
from app.db import Base

class Task(Base):
    __tablename__ = "tasks"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    intent_id = Column(Integer, ForeignKey("intents.id", ondelete="SET NULL"), nullable=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    embedding = Column(Vector(384), nullable=True)
    status = Column(String(32), nullable=False, server_default="open")
    priority = Column(String(16), nullable=True)
    due_at = Column(DateTime(timezone=True), nullable=True)
    duration_minutes = Column(Integer, nullable=True)
    parent_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=True, index=True)
    depends_on_id = Column(Integer, ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True, index=True)
    assigned_to = Column(Integer, ForeignKey("team_members.id", ondelete="SET NULL"), nullable=True, index=True)
    labels = Column(Text, nullable=True) # comma-separated
    tags = Column(Text, nullable=True)   # comma-separated
    energy_level = Column(String(16), nullable=True) # low, medium, high
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True)