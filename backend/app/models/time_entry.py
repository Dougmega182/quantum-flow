"""Time entry model — track actual time spent on tasks."""
from sqlalchemy import Column, Integer, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.db import Base


class TimeEntry(Base):
    __tablename__ = "time_entries"
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    started_at = Column(DateTime(timezone=True), nullable=False)
    ended_at = Column(DateTime(timezone=True), nullable=True)  # None = currently running
    duration_seconds = Column(Integer, nullable=True)  # computed on stop
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
