import enum
from sqlalchemy import Column, Integer, String, DateTime, Enum
from sqlalchemy.sql import func
from app.database import Base

class IntentType(str, enum.Enum):
    message = "message"
    email = "email"
    task = "task"

class Intent(Base):
    __tablename__ = "intents"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(Enum(IntentType), nullable=False)
    title = Column(String, nullable=False)
    content = Column(String, nullable=False)
    status = Column(String, default="new")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
