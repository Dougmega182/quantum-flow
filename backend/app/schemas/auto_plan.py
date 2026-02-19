from pydantic import BaseModel
from typing import Optional, List


class AutoPlanItem(BaseModel):
    task_id: int
    title: str
    start_time: str
    end_time: str
    duration_minutes: int
    block_label: Optional[str] = None
    rationale: Optional[str] = None


class AutoPlanResponse(BaseModel):
    items: List[AutoPlanItem]
    message: str
    total_focus_minutes: int = 0


class RescheduleItem(BaseModel):
    task_id: int
    title: str
    old_due: Optional[str] = None
    new_due: str
    rationale: str


class RescheduleResponse(BaseModel):
    items: List[RescheduleItem]
    message: str
