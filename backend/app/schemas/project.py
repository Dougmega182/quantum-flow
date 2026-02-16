from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict

class ProjectBase(BaseModel):
    name: str
    content: Optional[str] = None
    emoji: Optional[str] = "🚀"

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    content: Optional[str] = None
    emoji: Optional[str] = None

class ProjectOut(ProjectBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ProjectList(BaseModel):
    items: List[ProjectOut]
    total: int
