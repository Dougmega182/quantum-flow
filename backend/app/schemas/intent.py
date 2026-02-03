from pydantic import BaseModel, constr
from typing import Optional

class IntentBase(BaseModel):
    name: constr(strip_whitespace=True, min_length=1, max_length=255)
    description: Optional[str] = None

class IntentCreate(IntentBase):
    pass

class IntentUpdate(BaseModel):
    description: Optional[str] = None

class IntentOut(BaseModel):
    id: int
    name: str
    description: Optional[str]

    class Config:
        from_attributes = True