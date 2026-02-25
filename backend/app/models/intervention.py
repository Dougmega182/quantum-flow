from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float, Boolean
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import JSONB
from app.db import Base


class Intervention(Base):
    """Tracks each intervention triggered for a task.

    Types: countdown, body_double, shrink, script, micro_start, two_minute_rule
    Outcome: started, skipped, dismissed, completed
    """
    __tablename__ = "interventions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    intervention_type = Column(String(32), nullable=False)    # countdown, body_double, shrink, script, micro_start
    triggered_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    started_after_seconds = Column(Integer, nullable=True)    # seconds from trigger → user started task (null if never)
    outcome = Column(String(32), nullable=True)               # started, skipped, dismissed, completed
    metadata_json = Column(JSONB, nullable=True)              # extra data (micro-step text, script content, etc.)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
