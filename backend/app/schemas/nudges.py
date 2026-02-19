from pydantic import BaseModel
from typing import Optional, List


class Nudge(BaseModel):
    type: str          # stale, breakdown, overdue, energy_mismatch
    message: str
    task_id: Optional[int] = None
    action_type: str   # view_task, add_subtasks, reschedule, adjust_energy
    severity: str      # low, medium, high
