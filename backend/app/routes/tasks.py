from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app import models
from app.db import SessionLocal
from app.schemas.task import TaskCreate, TaskUpdate, TaskOut, TaskList, SubtaskCreate
from app.utils.nlp import parse_task_nlp

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
    view: Optional[str] = Query(None, description="today|overdue|upcoming|inbox"),
    label: Optional[str] = Query(None),
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

    if label:
        query = query.filter(models.Task.labels.ilike(f"%{label}%"))

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
    elif view == "inbox":
        # Inbox is tasks with no lables and no due date
        query = query.filter(
            (models.Task.labels == None) | (models.Task.labels == ""),
            models.Task.due_at == None
        )

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
    
    # NLP Parsing
    title, due_at = parse_task_nlp(data["title"])
    data["title"] = title
    if due_at and not data.get("due_at"):
        data["due_at"] = due_at

    status_val = data.get("status", "open")
    if status_val not in ALLOWED_STATUS:
        raise HTTPException(status_code=422, detail="INVALID_STATUS")

    # Validate dependency (no cycles)
    if data.get("depends_on_id"):
        _check_dependency_cycle(db, data["depends_on_id"], set())
    if data.get("parent_id"):
        parent = db.get(models.Task, data["parent_id"])
        if not parent or parent.deleted_at or parent.user_id != DEFAULT_USER_ID:
            raise HTTPException(status_code=422, detail="PARENT_NOT_FOUND")

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

    # Validate dependency cycle
    if "depends_on_id" in updates and updates["depends_on_id"]:
        if updates["depends_on_id"] == task_id:
            raise HTTPException(status_code=422, detail="SELF_DEPENDENCY")
        _check_dependency_cycle(db, updates["depends_on_id"], {task_id})

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

    # Block completion if dependency is incomplete
    if task.depends_on_id:
        dep = db.get(models.Task, task.depends_on_id)
        if dep and dep.status != "done" and dep.deleted_at is None:
            raise HTTPException(
                status_code=409,
                detail=f"DEPENDENCY_INCOMPLETE: task {dep.id} ('{dep.title}') must be completed first"
            )

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


# ── Subtask Endpoints ──────────────────────────────────────────────

@router.get("/{task_id}/subtasks", response_model=TaskList)
def list_subtasks(task_id: int, db: Session = Depends(get_db)):
    """List child tasks of a given parent task."""
    _get_task_or_404(db, task_id)  # verify parent exists
    children = (
        db.query(models.Task)
        .filter(
            models.Task.parent_id == task_id,
            models.Task.deleted_at.is_(None),
            models.Task.user_id == DEFAULT_USER_ID,
        )
        .order_by(models.Task.created_at)
        .all()
    )
    return {"items": children, "limit": len(children), "offset": 0, "total": len(children)}


@router.post("/{task_id}/subtasks", response_model=TaskOut, status_code=201)
def create_subtask(task_id: int, payload: SubtaskCreate, db: Session = Depends(get_db)):
    """Create a child task under the given parent."""
    _get_task_or_404(db, task_id)  # verify parent exists
    data = payload.model_dump()
    task = models.Task(user_id=DEFAULT_USER_ID, parent_id=task_id, **data)
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


# ── Helpers ────────────────────────────────────────────────────────

def _check_dependency_cycle(db: Session, dep_id: int, visited: set):
    """Walk the depends_on chain and raise if a cycle is detected."""
    if dep_id in visited:
        raise HTTPException(status_code=422, detail="CIRCULAR_DEPENDENCY")
    task = db.get(models.Task, dep_id)
    if not task:
        raise HTTPException(status_code=422, detail="DEPENDENCY_NOT_FOUND")
    visited.add(dep_id)
    if task.depends_on_id:
        _check_dependency_cycle(db, task.depends_on_id, visited)