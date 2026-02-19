"""Notification Center — Phase 4A.

List, mark-read, and generate daily digest notifications.
"""
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel

from app.db import SessionLocal
from app import models
from app.models.notification import Notification

router = APIRouter(prefix="/v1/notifications", tags=["notifications"])
DEFAULT_USER_ID = 1


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── Schemas ───────────────────────────────────────────────────────

class MarkReadRequest(BaseModel):
    notification_id: Optional[int] = None  # None = mark all read


def _serialize(n: Notification) -> dict:
    return {
        "id": n.id,
        "type": n.type,
        "title": n.title,
        "body": n.body,
        "read": n.read,
        "task_id": n.task_id,
        "created_at": n.created_at.isoformat() if n.created_at else None,
    }


# ── Endpoints ─────────────────────────────────────────────────────

@router.get("")
def list_notifications(unread_only: bool = False, db: Session = Depends(get_db)):
    q = db.query(Notification).filter(Notification.user_id == DEFAULT_USER_ID)
    if unread_only:
        q = q.filter(Notification.read == False)
    notifications = q.order_by(Notification.created_at.desc()).limit(50).all()
    unread_count = (
        db.query(func.count(Notification.id))
        .filter(Notification.user_id == DEFAULT_USER_ID, Notification.read == False)
        .scalar()
    )
    return {
        "notifications": [_serialize(n) for n in notifications],
        "unread_count": unread_count or 0,
    }


@router.post("/mark-read")
def mark_read(body: MarkReadRequest, db: Session = Depends(get_db)):
    if body.notification_id:
        n = db.get(Notification, body.notification_id)
        if not n:
            raise HTTPException(status_code=404, detail="Notification not found")
        n.read = True
        db.commit()
        return {"marked": 1}
    else:
        count = (
            db.query(Notification)
            .filter(Notification.user_id == DEFAULT_USER_ID, Notification.read == False)
            .update({"read": True})
        )
        db.commit()
        return {"marked": count}


@router.post("/generate-digest")
def generate_digest(db: Session = Depends(get_db)):
    """Generate a daily digest notification summarizing current state."""
    now = datetime.utcnow()
    today = now.date()

    # ── Streak ────────────────────────────────────────────────
    completed_dates = (
        db.query(func.date(models.Task.completed_at))
        .filter(models.Task.status == "done", models.Task.completed_at.isnot(None))
        .distinct()
        .order_by(func.date(models.Task.completed_at).desc())
        .all()
    )
    dates = sorted([d[0] for d in completed_dates], reverse=True)
    streak = 0
    for i, d in enumerate(dates):
        if d == today - timedelta(days=i):
            streak += 1
        else:
            break

    # ── Overdue ───────────────────────────────────────────────
    overdue_count = (
        db.query(func.count(models.Task.id))
        .filter(
            models.Task.user_id == DEFAULT_USER_ID,
            models.Task.deleted_at.is_(None),
            models.Task.status != "done",
            models.Task.due_at < now,
        )
        .scalar()
    ) or 0

    # ── Due today ─────────────────────────────────────────────
    today_start = datetime(now.year, now.month, now.day)
    today_end = today_start + timedelta(days=1)
    due_today = (
        db.query(func.count(models.Task.id))
        .filter(
            models.Task.user_id == DEFAULT_USER_ID,
            models.Task.deleted_at.is_(None),
            models.Task.status != "done",
            models.Task.due_at >= today_start,
            models.Task.due_at < today_end,
        )
        .scalar()
    ) or 0

    # ── Top priorities ────────────────────────────────────────
    high_prio = (
        db.query(models.Task)
        .filter(
            models.Task.user_id == DEFAULT_USER_ID,
            models.Task.deleted_at.is_(None),
            models.Task.status != "done",
            models.Task.priority == "high",
        )
        .limit(3)
        .all()
    )
    prio_list = ", ".join(f'"{t.title}"' for t in high_prio) if high_prio else "none"

    # ── Build digest ──────────────────────────────────────────
    lines = [f"🔥 Streak: {streak} day{'s' if streak != 1 else ''}"]
    if overdue_count > 0:
        lines.append(f"⏰ {overdue_count} overdue task{'s' if overdue_count != 1 else ''}")
    lines.append(f"📅 {due_today} task{'s' if due_today != 1 else ''} due today")
    if high_prio:
        lines.append(f"🎯 Top priorities: {prio_list}")

    body = "\n".join(lines)

    notification = Notification(
        user_id=DEFAULT_USER_ID,
        type="digest",
        title=f"📊 Daily Digest — {today.strftime('%b %d')}",
        body=body,
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)

    return _serialize(notification)
