from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.db import Base

class RecurrenceRule(Base):
    __tablename__ = "recurrence_rules"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    template_id = Column(Integer, ForeignKey("task_templates.id", ondelete="CASCADE"), nullable=False, index=True)
    freq = Column(String(16), nullable=False)  # daily, weekly, monthly
    interval = Column(Integer, nullable=False, server_default="1")
    byweekday = Column(String(32), nullable=True)  # e.g., "MO,TU,FR"
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_materialized_at = Column(DateTime(timezone=True), nullable=True)