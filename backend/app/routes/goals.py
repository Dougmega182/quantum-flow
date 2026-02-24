"""Goals & OKRs — Phase 5B.

CRUD for objectives, link tasks to goals, auto-compute progress.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from sqlalchemy import func as sqlfunc

from app.db import SessionLocal
from app import models
from app.models.goal import Goal, GoalTask
from app.models.activity import Activity

router = APIRouter(prefix="/v1/goals", tags=["goals"])
DEFAULT_USER_ID = 1


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class GoalCreate(BaseModel):
    title: str
    description: Optional[str] = None
    target_value: float = 100
    unit: str = "%"


class GoalUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    target_value: Optional[float] = None
    current_value: Optional[float] = None
    unit: Optional[str] = None
    status: Optional[str] = None


class LinkTaskBody(BaseModel):
    task_id: int


def _serialize(g: Goal) -> dict:
    return {
        "id": g.id,
        "title": g.title,
        "description": g.description,
        "target_value": g.target_value,
        "current_value": g.current_value,
        "unit": g.unit,
        "status": g.status,
        "progress_pct": round((g.current_value / g.target_value) * 100, 1) if g.target_value else 0,
        "created_at": g.created_at.isoformat() if g.created_at else None,
    }


def _log_activity(db: Session, action: str, entity_type: str, entity_id: int, title: str, meta: dict = None):
    db.add(Activity(
        user_id=DEFAULT_USER_ID, action=action,
        entity_type=entity_type, entity_id=entity_id,
        entity_title=title, metadata_json=meta,
    ))


@router.get("")
def list_goals(status: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(Goal).filter(Goal.user_id == DEFAULT_USER_ID)
    if status:
        q = q.filter(Goal.status == status)
    goals = q.order_by(Goal.created_at.desc()).all()
    return {"goals": [_serialize(g) for g in goals]}


@router.post("", status_code=201)
def create_goal(body: GoalCreate, db: Session = Depends(get_db)):
    g = Goal(
        user_id=DEFAULT_USER_ID,
        title=body.title,
        description=body.description,
        target_value=body.target_value,
        unit=body.unit,
    )
    db.add(g)
    db.flush()
    _log_activity(db, "created", "goal", g.id, g.title)
    db.commit()
    db.refresh(g)
    return _serialize(g)


@router.patch("/{goal_id}")
def update_goal(goal_id: int, body: GoalUpdate, db: Session = Depends(get_db)):
    g = db.get(Goal, goal_id)
    if not g:
        raise HTTPException(status_code=404, detail="Goal not found")
    for k, v in body.dict(exclude_unset=True).items():
        setattr(g, k, v)
    if g.current_value >= g.target_value and g.status == "active":
        g.status = "completed"
    _log_activity(db, "updated", "goal", g.id, g.title)
    db.commit()
    return _serialize(g)


@router.delete("/{goal_id}")
def delete_goal(goal_id: int, db: Session = Depends(get_db)):
    g = db.get(Goal, goal_id)
    if not g:
        raise HTTPException(status_code=404, detail="Goal not found")
    _log_activity(db, "deleted", "goal", g.id, g.title)
    db.delete(g)
    db.commit()
    return {"status": "deleted"}


@router.post("/{goal_id}/link", status_code=201)
def link_task(goal_id: int, body: LinkTaskBody, db: Session = Depends(get_db)):
    """Link a task to a goal. Completed linked tasks contribute to progress."""
    g = db.get(Goal, goal_id)
    if not g:
        raise HTTPException(status_code=404, detail="Goal not found")
    existing = db.query(GoalTask).filter(GoalTask.goal_id == goal_id, GoalTask.task_id == body.task_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Task already linked")
    db.add(GoalTask(goal_id=goal_id, task_id=body.task_id))
    db.commit()
    return {"status": "linked", "goal_id": goal_id, "task_id": body.task_id}


@router.get("/{goal_id}/progress")
def goal_progress(goal_id: int, db: Session = Depends(get_db)):
    """Get goal progress including linked task completion stats."""
    g = db.get(Goal, goal_id)
    if not g:
        raise HTTPException(status_code=404, detail="Goal not found")

    linked = db.query(GoalTask).filter(GoalTask.goal_id == goal_id).all()
    task_ids = [lt.task_id for lt in linked]

    if task_ids:
        total = len(task_ids)
        done = (
            db.query(sqlfunc.count(models.Task.id))
            .filter(models.Task.id.in_(task_ids), models.Task.status == "done")
            .scalar()
        ) or 0

        # Auto-update current_value based on task completion if unit is tasks or %
        if g.unit in ("%", "tasks"):
            g.current_value = done if g.unit == "tasks" else round((done / total) * g.target_value, 1)
            if g.current_value >= g.target_value and g.status == "active":
                g.status = "completed"
            db.commit()

        linked_tasks = (
            db.query(models.Task)
            .filter(models.Task.id.in_(task_ids))
            .all()
        )
        tasks_data = [{"id": t.id, "title": t.title, "status": t.status} for t in linked_tasks]
    else:
        total = 0
        done = 0
        tasks_data = []

    return {
        **_serialize(g),
        "linked_tasks": tasks_data,
        "tasks_total": total,
        "tasks_done": done,
    }
