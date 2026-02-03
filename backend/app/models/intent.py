from sqlalchemy import Column, Integer, Text
from sqlalchemy.dialects.postgresql import CITEXT
from app.db import Base

class Intent(Base):
    __tablename__ = "intents"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(CITEXT, unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)