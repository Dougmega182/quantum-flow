from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import JSONB
from app.db import Base


class ActivationEvent(Base):
    """Logs every activation-related event for future ML training.

    Event types:
      - task_opened: user viewed task detail
      - task_started: user started timer or marked in-progress
      - task_avoided: opened but left without action
      - task_rescheduled: due date changed
      - intervention_triggered: system fired an intervention
      - intervention_outcome: result of intervention
      - session_started: focus/start mode entered
      - session_completed: focus session finished
      - hyperfocus_warning: 90+ min prompt shown
      - recovery_triggered: shame-free recovery activated
    """
    __tablename__ = "activation_events"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True, index=True)
    event_type = Column(String(48), nullable=False, index=True)
    friction_score_at_event = Column(Float, nullable=True)   # snapshot of friction when event occurred
    start_latency_seconds = Column(Integer, nullable=True)   # time from seeing task → starting
    metadata_json = Column(JSONB, nullable=True)             # flexible extra data
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
