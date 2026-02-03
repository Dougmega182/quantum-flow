from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.db import Base

class TaskTemplate(Base):
    __tablename__ = "task_templates"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    intent_id = Column(Integer, ForeignKey("intents.id", ondelete="SET NULL"), nullable=True, index=True)
    priority = Column(String(16), nullable=True)
    default_due_days = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)