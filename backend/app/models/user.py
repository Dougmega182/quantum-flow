from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from app.db import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    avatar_url = Column(String(512), nullable=True)
    theme_preference = Column(String(16), server_default="light", nullable=False)
    accent_color = Column(String(7), server_default="#9333ea", nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)