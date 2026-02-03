from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class AutomationBase(BaseModel):
    name: str
    description: Optional[str] = None
    trigger_type: str       # e.g., task_status, time_based
    trigger_config: Optional[str] = None
    action_type: str        # e.g., create_task, update_task, notify
    action_config: Optional[str] = None
    active: Optional[bool] = True

class AutomationCreate(AutomationBase):
    pass

class AutomationUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    trigger_type: Optional[str] = None
    trigger_config: Optional[str] = None
    action_type: Optional[str] = None
    action_config: Optional[str] = None
    active: Optional[bool] = None

class AutomationOut(AutomationBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True

class AutomationRunOut(BaseModel):
    id: int
    automation_id: int
    status: str
    message: Optional[str]
    created_at: datetime
    class Config:
        from_attributes = True