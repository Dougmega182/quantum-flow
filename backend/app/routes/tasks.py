from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
from app.db import SessionLocal
from app import models
from app.schemas.task import TaskCreate, TaskUpdate, TaskOut, TaskList

router = APIRouter(prefix="/v1/tasks", tags=["tasks"])

DEFAULT_USER_ID = 1

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
    due_before: Optional[datetime] = Query(None),
    due_after: Optional[datetime] = Query(None),
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
        query = query.filter(models.Task.status == status)
    if intent_id:
        query = query.filter(models.Task.intent_id == intent_id)
    if due_before:
        query = query.filter(models.Task.due_at <= due_before)
    if due_after:
        query = query.filter(models.Task.due_at >= due_after)
    if q:
        like = f"%{q}%"
        query = query.filter(
            models.Task.title.ilike(like) | models.Task.description.ilike(like)
        )
    total = query.count()
    items = query.order_by(models.Task.due_at.nulls_last(), models.Task.id).offset(offset).limit(limit).all()
    return TaskList(items=items, limit=limit, offset=offset, total=total)


@router.get("/{task_id}", response_model=TaskOut)
def get_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(models.Task).get(task_id)
    if not task or task.deleted_at is not None or task.user_id != DEFAULT_USER_ID:
        raise HTTPException(status_code=404, detail="TASK_NOT_FOUND")
    return task

@router.post("", response_model=TaskOut, status_code=201)
def create_task(payload: TaskCreate, db: Session = Depends(get_db)):
    task = models.Task(user_id=DEFAULT_USER_ID, **payload.dict())
    db.add(task)
    db.commit()
    db.refresh(task)
    return task

@router.patch("/{task_id}", response_model=TaskOut)
def update_task(task_id: int, payload: TaskUpdate, db: Session = Depends(get_db)):
    task = db.query(models.Task).get(task_id)
    if not task or task.deleted_at is not None or task.user_id != DEFAULT_USER_ID:
        raise HTTPException(status_code=404, detail="TASK_NOT_FOUND")
    for field, value in payload.dict(exclude_unset=True).items():
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
    task = db.query(models.Task).get(task_id)
    if not task or task.deleted_at is not None or task.user_id != DEFAULT_USER_ID:
        raise HTTPException(status_code=404, detail="TASK_NOT_FOUND")
    task.status = "done"
    task.completed_at = datetime.utcnow()
    db.commit()
    db.refresh(task)
    return task

@router.post("/{task_id}/reopen", response_model=TaskOut)
def reopen_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(models.Task).get(task_id)
    if not task or task.deleted_at is not None or task.user_id != DEFAULT_USER_ID:
        raise HTTPException(status_code=404, detail="TASK_NOT_FOUND")
    task.status = "open"
    task.completed_at = None
    db.commit()
    db.refresh(task)
    return task

@router.delete("/{task_id}")
def delete_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(models.Task).get(task_id)
    if not task or task.deleted_at is not None or task.user_id != DEFAULT_USER_ID:
        raise HTTPException(status_code=404, detail="TASK_NOT_FOUND")
    task.deleted_at = datetime.utcnow()
    db.commit()
    return {"status": "deleted"}