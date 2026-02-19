from pydantic import BaseModel
from typing import Optional, List


class ChatRequest(BaseModel):
    message: str


class ChatAction(BaseModel):
    type: str       # created_task, scheduled, rescheduled, listed, info
    task_id: Optional[int] = None
    detail: Optional[str] = None


class ChatResponse(BaseModel):
    reply: str
    actions: List[ChatAction] = []
    task_card: Optional[dict] = None
    schedule_preview: Optional[List[dict]] = None
