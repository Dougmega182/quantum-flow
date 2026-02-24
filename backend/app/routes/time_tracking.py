"""Time Tracking — Phase 5A.

Start/stop timer, list entries, actual-vs-estimated analysis.
"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional

from app.db import SessionLocal
from app import models
from app.models.time_entry import TimeEntry

router = APIRouter(prefix="/v1/time", tags=["time-tracking"])
DEFAULT_USER_ID = 1


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class StartTimerRequest(BaseModel):
    task_id: int


class StopTimerRequest(BaseModel):
    entry_id: int


def _serialize(e: TimeEntry) -> dict:
    return {
        "id": e.id,
        "task_id": e.task_id,
        "started_at": e.started_at.isoformat() if e.started_at else None,
        "ended_at": e.ended_at.isoformat() if e.ended_at else None,
        "duration_seconds": e.duration_seconds,
        "is_running": e.ended_at is None,
    }


@router.post("/start", status_code=201)
def start_timer(body: StartTimerRequest, db: Session = Depends(get_db)):
    """Start a timer for a task. Stops any currently running timer first."""
    # Stop any currently running timers
    running = (
        db.query(TimeEntry)
        .filter(TimeEntry.user_id == DEFAULT_USER_ID, TimeEntry.ended_at.is_(None))
        .all()
    )
    now = datetime.utcnow()
    for r in running:
        r.ended_at = now
        r.duration_seconds = int((now - r.started_at).total_seconds())

    # Start new timer
    entry = TimeEntry(
        task_id=body.task_id,
        user_id=DEFAULT_USER_ID,
        started_at=now,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return _serialize(entry)


@router.post("/stop")
def stop_timer(body: StopTimerRequest, db: Session = Depends(get_db)):
    """Stop a running timer."""
    entry = db.get(TimeEntry, body.entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Timer not found")
    if entry.ended_at:
        raise HTTPException(status_code=400, detail="Timer already stopped")

    now = datetime.utcnow()
    entry.ended_at = now
    entry.duration_seconds = int((now - entry.started_at).total_seconds())
    db.commit()
    return _serialize(entry)


@router.get("/running")
def get_running(db: Session = Depends(get_db)):
    """Get currently running timer, if any."""
    entry = (
        db.query(TimeEntry)
        .filter(TimeEntry.user_id == DEFAULT_USER_ID, TimeEntry.ended_at.is_(None))
        .first()
    )
    if not entry:
        return {"running": False, "entry": None}
    return {"running": True, "entry": _serialize(entry)}


@router.get("/entries")
def list_entries(task_id: Optional[int] = None, limit: int = 50, db: Session = Depends(get_db)):
    """List time entries, optionally filtered by task."""
    q = db.query(TimeEntry).filter(TimeEntry.user_id == DEFAULT_USER_ID)
    if task_id:
        q = q.filter(TimeEntry.task_id == task_id)
    entries = q.order_by(TimeEntry.started_at.desc()).limit(limit).all()
    return {"entries": [_serialize(e) for e in entries]}


@router.get("/analysis")
def time_analysis(db: Session = Depends(get_db)):
    """Compare actual time tracked vs estimated duration for completed tasks."""
    # Get tasks with both time entries and estimated duration
    tasks_with_time = (
        db.query(
            models.Task.id,
            models.Task.title,
            models.Task.duration_minutes,
            func.sum(TimeEntry.duration_seconds).label("actual_seconds"),
        )
        .join(TimeEntry, TimeEntry.task_id == models.Task.id)
        .filter(
            models.Task.user_id == DEFAULT_USER_ID,
            models.Task.duration_minutes.isnot(None),
            TimeEntry.duration_seconds.isnot(None),
        )
        .group_by(models.Task.id, models.Task.title, models.Task.duration_minutes)
        .limit(20)
        .all()
    )

    comparisons = []
    total_estimated = 0
    total_actual = 0

    for task_id, title, est_minutes, actual_secs in tasks_with_time:
        est_secs = est_minutes * 60
        accuracy = round((actual_secs / est_secs) * 100, 1) if est_secs > 0 else 0
        total_estimated += est_secs
        total_actual += actual_secs
        comparisons.append({
            "task_id": task_id,
            "title": title,
            "estimated_minutes": est_minutes,
            "actual_minutes": round(actual_secs / 60, 1),
            "accuracy_pct": accuracy,
            "over_under": "over" if actual_secs > est_secs else "under",
        })

    # Summary stats
    total_tracked_hours = (
        db.query(func.sum(TimeEntry.duration_seconds))
        .filter(TimeEntry.user_id == DEFAULT_USER_ID, TimeEntry.duration_seconds.isnot(None))
        .scalar()
    ) or 0

    active_entries_count = (
        db.query(func.count(TimeEntry.id))
        .filter(TimeEntry.user_id == DEFAULT_USER_ID)
        .scalar()
    ) or 0

    avg_accuracy = round((total_actual / total_estimated) * 100, 1) if total_estimated > 0 else 100

    return {
        "comparisons": comparisons,
        "summary": {
            "total_tracked_hours": round(total_tracked_hours / 3600, 1),
            "total_entries": active_entries_count,
            "avg_accuracy_pct": avg_accuracy,
        },
    }
