from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.db import Base
from sqlalchemy.dialects.postgresql import JSONB

class Automation(Base):
    __tablename__ = "automations"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    trigger_type = Column(String(64), nullable=False)
    trigger_config = Column(JSONB, nullable=True)
    action_type = Column(String(64), nullable=False)
    action_config = Column(JSONB, nullable=True)
    active = Column(Boolean, nullable=False, server_default="true")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)