from pydantic import BaseModel, constr
from typing import Optional, List
from datetime import datetime

class TaskBase(BaseModel):
    title: constr(strip_whitespace=True, min_length=1, max_length=255)
    description: Optional[str] = None
    intent_id: Optional[int] = None
    labels: Optional[str] = None
    tags: Optional[str] = None
    due_at: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    parent_id: Optional[int] = None

class TaskCreate(TaskBase):
    status: Optional[str] = "open"  # allow override, validated in router

class TaskUpdate(BaseModel):
    title: Optional[constr(strip_whitespace=True, min_length=1, max_length=255)] = None
    description: Optional[str] = None
    intent_id: Optional[int] = None
    priority: Optional[str] = None
    labels: Optional[str] = None
    tags: Optional[str] = None
    due_at: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    parent_id: Optional[int] = None
    status: Optional[str] = None  # open, in_progress, done

class TaskOut(BaseModel):
    id: int
    user_id: int
    intent_id: int | None
    title: str
    description: str | None
    status: str
    priority: str | None
    labels: str | None
    tags: str | None
    due_at: datetime | None
    duration_minutes: int | None
    parent_id: int | None
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None
    deleted_at: datetime | None

    class Config:
        from_attributes = True

class TaskList(BaseModel):
    items: List[TaskOut]
    limit: int
    offset: int
    total: int