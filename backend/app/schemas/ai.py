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