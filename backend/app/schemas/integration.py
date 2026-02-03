from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class IntegrationBase(BaseModel):
    provider: str
    status: Optional[str] = "disconnected"
    config_json: Optional[str] = None

class IntegrationCreate(IntegrationBase):
    pass

class IntegrationUpdate(BaseModel):
    status: Optional[str] = None
    config_json: Optional[str] = None

class IntegrationOut(IntegrationBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True

class IntegrationEventOut(BaseModel):
    id: int
    integration_id: int
    event_type: str
    message: Optional[str]
    created_at: datetime
    class Config:
        from_attributes = True