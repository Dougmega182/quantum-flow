from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func
from app.database import Base

class Intent(Base):
    __tablename__ = "intents"

    id = Column(Integer, primary_key=True, index=True)
    source = Column(String(50), nullable=False)  # email, voice, manual
    content = Column(Text, nullable=False)
    status = Column(String(20), default="inbox")  # inbox | clarified | scheduled
    created_at = Column(DateTime(timezone=True), server_default=func.now())
