"""Workflow Blueprint model — reusable task templates with step chains."""
from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func
from app.db import Base


class WorkflowBlueprint(Base):
    __tablename__ = "workflow_blueprints"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=True)  # e.g. "Engineering", "Marketing", "Onboarding"
    steps_json = Column(Text, nullable=False, server_default="[]")  # JSON array of step defs
    is_builtin = Column(Integer, nullable=False, server_default="0")  # 1 = system-provided
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
