import uuid
from sqlalchemy import String, Text, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base
import enum

class IntentType(enum.Enum):
    task = "task"
    message = "message"
    reminder = "reminder"
    idea = "idea"

class Intent(Base):
    __tablename__ = "intents"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    type: Mapped[IntentType] = mapped_column(Enum(IntentType))
    title: Mapped[str] = mapped_column(String(255))
    content: Mapped[str] = mapped_column(Text)
