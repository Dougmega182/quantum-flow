from pydantic import BaseModel
from typing import Optional, List

class AISuggestion(BaseModel):
    title: str
    description: Optional[str] = None
    action_type: str
    payload: dict
    confidence: float

class AISummaryRequest(BaseModel):
    text: str

class AISummaryResponse(BaseModel):
    summary: str

class SmartScheduleItem(BaseModel):
    task_id: int
    title: str
    start_time: str
    end_time: str
    duration_minutes: int
    rationale: Optional[str] = None

class SmartScheduleResponse(BaseModel):
    items: List[SmartScheduleItem]
    message: str