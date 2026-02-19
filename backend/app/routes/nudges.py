from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db import SessionLocal
from app import models
from app.schemas.nudges import Nudge

router = APIRouter(prefix="/v1/ai", tags=["ai"])
DEFAULT_USER_ID = 1


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/nudges", response_model=list[Nudge])
def get_nudges(db: Session = Depends(get_db)):
    """Generate contextual nudges based on current task state."""
    now = datetime.utcnow()
    nudges: list[Nudge] = []

    open_tasks = (
        db.query(models.Task)
        .filter(
            models.Task.user_id == DEFAULT_USER_ID,
            models.Task.deleted_at.is_(None),
            models.Task.status != "done",
        )
        .all()
    )

    for t in open_tasks:
        # 1. Overdue reminder (highest severity)
        if t.due_at and t.due_at < now:
            days = (now - t.due_at).days
            nudges.append(Nudge(
                type="overdue",
                message=f"⏰ '{t.title}' is {days} day{'s' if days != 1 else ''} overdue",
                task_id=t.id,
                action_type="reschedule",
                severity="high" if days > 3 else "medium",
            ))

        # 2. Stale task alert (no updates in 7+ days)
        if t.updated_at and (now - t.updated_at).days >= 7:
            nudges.append(Nudge(
                type="stale",
                message=f"🕸️ '{t.title}' hasn't been touched in {(now - t.updated_at).days} days",
                task_id=t.id,
                action_type="view_task",
                severity="low",
            ))

        # 3. Breakdown suggestion (big task with no subtasks)
        if (t.duration_minutes or 0) >= 60 and t.priority in ("high", "medium"):
            has_children = (
                db.query(models.Task)
                .filter(
                    models.Task.parent_id == t.id,
                    models.Task.deleted_at.is_(None),
                )
                .first()
            )
            if not has_children:
                nudges.append(Nudge(
                    type="breakdown",
                    message=f"🔨 '{t.title}' is {t.duration_minutes}min — consider breaking it into subtasks",
                    task_id=t.id,
                    action_type="add_subtasks",
                    severity="medium",
                ))

    # Sort: high severity first, then medium, then low
    severity_order = {"high": 0, "medium": 1, "low": 2}
    nudges.sort(key=lambda n: severity_order.get(n.severity, 3))

    return nudges[:10]  # Cap at 10 nudges
