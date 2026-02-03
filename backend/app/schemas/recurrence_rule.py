from pydantic import BaseModel, constr
from typing import Optional
from datetime import date, datetime

class RecurrenceRuleBase(BaseModel):
    template_id: int
    freq: constr(strip_whitespace=True, min_length=1, max_length=16)  # daily, weekly, monthly
    interval: Optional[int] = 1
    byweekday: Optional[str] = None  # e.g., "MO,TU,FR"
    start_date: Optional[date] = None
    end_date: Optional[date] = None

class RecurrenceRuleCreate(RecurrenceRuleBase):
    pass

class RecurrenceRuleOut(RecurrenceRuleBase):
    id: int
    user_id: int
    created_at: datetime
    last_materialized_at: Optional[datetime] = None
    class Config:
        from_attributes = True