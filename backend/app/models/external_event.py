from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint
from app.db import Base

class ExternalEvent(Base):
    __tablename__ = "external_events"
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    provider = Column(String(64), nullable=False)
    external_id = Column(String(255), nullable=False)
    last_synced_at = Column(DateTime(timezone=True), nullable=True)
    __table_args__ = (UniqueConstraint("provider", "external_id", name="uq_external_event_provider_external_id"),)