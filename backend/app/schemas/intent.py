from pydantic import BaseModel
from enum import Enum

class IntentType(str, Enum):
    task = "task"
    message = "message"
    reminder = "reminder"
    idea = "idea"

class IntentCreate(BaseModel):
    type: IntentType
    title: str
    content: str
