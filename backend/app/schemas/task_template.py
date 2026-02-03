from pydantic import BaseModel, constr
from typing import Optional

class TaskTemplateBase(BaseModel):
    title: constr(strip_whitespace=True, min_length=1, max_length=255)
    description: Optional[str] = None
    intent_id: Optional[int] = None
    priority: Optional[str] = None
    default_due_days: Optional[int] = None

class TaskTemplateCreate(TaskTemplateBase):
    pass

class TaskTemplateOut(TaskTemplateBase):
    id: int
    user_id: int
    class Config:
        from_attributes = True