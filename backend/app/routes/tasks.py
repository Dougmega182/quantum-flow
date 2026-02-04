from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app import models
from app.db import SessionLocal
from app.schemas.task import TaskCreate, TaskUpdate, TaskOut, TaskList

router = APIRouter(prefix="/v1/tasks", tags=["tasks"])

DEFAULT_USER_ID = 1
ALLOWED_STATUS = {"open", "in_progress", "done"}


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("", response_model=TaskList)
def list_tasks(
    status: Optional[str] = Query(None),
    intent_id: Optional[int] = Query(None),
    priority: Optional[str] = Query(None),
    due_before: Optional[datetime] = Query(None),
    due_after: Optional[datetime] = Query(None),
    view: Optional[str] = Query(None, description="today|overdue|upcoming"),
    q: Optional[str] = Query(None),
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
):
    limit = min(limit, 200)
    query = db.query(models.Task).filter(
        models.Task.deleted_at.is_(None),
        models.Task.user_id == DEFAULT_USER_ID,
    )

    if status:
        if status not in ALLOWED_STATUS:
            raise HTTPException(status_code=422, detail="INVALID_STATUS")
        query = query.filter(models.Task.status == status)

    if intent_id:
        query = query.filter(models.Task.intent_id == intent_id)

    if priority:
        query = query.filter(models.Task.priority == priority)

    now = datetime.utcnow()
    if view == "today":
        start = datetime(now.year, now.month, now.day)
        end = start + timedelta(days=1)
        query = query.filter(models.Task.due_at >= start, models.Task.due_at < end)
    elif view == "overdue":
        query = query.filter(models.Task.due_at < now, models.Task.status != "done")
    elif view == "upcoming":
        query = query.filter(models.Task.due_at >= now)

    if due_before:
        query = query.filter(models.Task.due_at <= due_before)
    if due_after:
        query = query.filter(models.Task.due_at >= due_after)

    if q:
        like = f"%{q}%"
        query = query.filter(models.Task.title.ilike(like) | models.Task.description.ilike(like))

    total = query.count()
    items = (
        query.order_by(models.Task.due_at.nulls_last(), models.Task.id)
        .offset(offset)
        .limit(limit)
        .all()
    )
    return {
        "items": items,
        "limit": limit,
        "offset": offset,
        "total": total,
    }


def _get_task_or_404(db: Session, task_id: int):
    task = db.get(models.Task, task_id)
    if not task or task.deleted_at is not None or task.user_id != DEFAULT_USER_ID:
        raise HTTPException(status_code=404, detail="TASK_NOT_FOUND")
    return task


@router.get("/{task_id}", response_model=TaskOut)
def get_task(task_id: int, db: Session = Depends(get_db)):
    return _get_task_or_404(db, task_id)


@router.post("", response_model=TaskOut, status_code=201)
def create_task(payload: TaskCreate, db: Session = Depends(get_db)):
    data = payload.model_dump()
    status_val = data.get("status", "open")
    if status_val not in ALLOWED_STATUS:
        raise HTTPException(status_code=422, detail="INVALID_STATUS")
    task = models.Task(user_id=DEFAULT_USER_ID, **data)
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.patch("/{task_id}", response_model=TaskOut)
def update_task(task_id: int, payload: TaskUpdate, db: Session = Depends(get_db)):
    task = _get_task_or_404(db, task_id)
    updates = payload.model_dump(exclude_unset=True)
    if "status" in updates and updates["status"] not in ALLOWED_STATUS:
        raise HTTPException(status_code=422, detail="INVALID_STATUS")

    for field, value in updates.items():
        setattr(task, field, value)

    if task.status == "done" and task.completed_at is None:
        task.completed_at = datetime.utcnow()
    if task.status != "done":
        task.completed_at = None

    db.commit()
    db.refresh(task)
    return task


@router.post("/{task_id}/complete", response_model=TaskOut)
def complete_task(task_id: int, db: Session = Depends(get_db)):
    task = _get_task_or_404(db, task_id)
    task.status = "done"
    task.completed_at = datetime.utcnow()
    db.commit()
    db.refresh(task)
    return task


@router.post("/{task_id}/reopen", response_model=TaskOut)
def reopen_task(task_id: int, db: Session = Depends(get_db)):
    task = _get_task_or_404(db, task_id)
    task.status = "open"
    task.completed_at = None
    db.commit()
    db.refresh(task)
    return task


@router.delete("/{task_id}")
def delete_task(task_id: int, db: Session = Depends(get_db)):
    task = _get_task_or_404(db, task_id)
    task.deleted_at = datetime.utcnow()
    db.commit()
    return {"status": "deleted"}