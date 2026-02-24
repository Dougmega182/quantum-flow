"""Goal model — OKR-style objectives with progress tracking."""
from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.sql import func
from app.db import Base


class Goal(Base):
    __tablename__ = "goals"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    target_value = Column(Float, nullable=False, default=100)
    current_value = Column(Float, nullable=False, default=0)
    unit = Column(String(50), nullable=True, default="%")  # %, tasks, hours, etc.
    status = Column(String(20), nullable=False, default="active")  # active, completed, archived
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class GoalTask(Base):
    """Links goals to tasks — completing linked tasks auto-updates goal progress."""
    __tablename__ = "goal_tasks"
    id = Column(Integer, primary_key=True, index=True)
    goal_id = Column(Integer, ForeignKey("goals.id", ondelete="CASCADE"), nullable=False, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
