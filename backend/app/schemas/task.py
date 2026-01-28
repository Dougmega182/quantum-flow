from pydantic import BaseModel, constr
from typing import Optional, List
from datetime import datetime

class TaskBase(BaseModel):
    title: constr(strip_whitespace=True, min_length=1, max_length=255)
    description: Optional[str] = None
    intent_id: Optional[int] = None
    priority: Optional[str] = None
    due_at: Optional[datetime] = None

class TaskCreate(TaskBase):
    status: Optional[str] = "open"  # allow override, validated in router

class TaskUpdate(BaseModel):
    title: Optional[constr(strip_whitespace=True, min_length=1, max_length=255)] = None
    description: Optional[str] = None
    intent_id: Optional[int] = None
    priority: Optional[str] = None
    due_at: Optional[datetime] = None
    status: Optional[str] = None  # open, in_progress, done

class TaskOut(BaseModel):
    id: int
    user_id: int
    intent_id: Optional[int]
    title: str
    description: Optional[str]
    status: str
    priority: Optional[str]
    due_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime]
    deleted_at: Optional[datetime]

    class Config:
        from_attributes = True

class TaskList(BaseModel):
    items: List[TaskOut]
    limit: int
    offset: int
    total: int

    class Config:
        from_attributes = True