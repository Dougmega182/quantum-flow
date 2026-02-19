from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db import SessionLocal
from app import models
from app.schemas.auto_plan import (
    AutoPlanItem, AutoPlanResponse,
    RescheduleItem, RescheduleResponse,
)

router = APIRouter(prefix="/v1/ai", tags=["ai"])
DEFAULT_USER_ID = 1

PRIORITY_MAP = {"high": 3, "medium": 2, "low": 1}


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _detect_peak_hours(db: Session) -> set[int]:
    """Detect peak productivity hours — uses persisted EnergyProfile if available, else raw completions."""
    from app.models.energy_profile import EnergyProfile

    # Prefer persisted profile
    profiles = (
        db.query(EnergyProfile)
        .filter(EnergyProfile.user_id == DEFAULT_USER_ID, EnergyProfile.productivity_score > 0)
        .all()
    )
    if profiles:
        max_score = max(p.productivity_score for p in profiles)
        peak = {p.hour for p in profiles if p.productivity_score >= max_score * 0.7}
        return peak if peak else {9, 10, 11, 12}

    # Fallback: compute from raw completions
    last_month = datetime.utcnow() - timedelta(days=30)
    hourly_stats = (
        db.query(
            func.extract("hour", models.Task.completed_at),
            func.count(models.Task.id),
        )
        .filter(
            models.Task.status == "done",
            models.Task.completed_at >= last_month,
        )
        .group_by(func.extract("hour", models.Task.completed_at))
        .all()
    )
    heatmap = {int(h): c for h, c in hourly_stats}
    max_completions = max(heatmap.values()) if heatmap else 0
    peak = {h for h, c in heatmap.items() if c >= max_completions * 0.8 and c > 0}
    return peak if peak else {9, 10, 11, 12}


def _get_open_tasks(db: Session):
    """Fetch all open, non-deleted tasks for the default user."""
    return (
        db.query(models.Task)
        .filter(
            models.Task.user_id == DEFAULT_USER_ID,
            models.Task.deleted_at.is_(None),
            models.Task.status != "done",
        )
        .all()
    )


def _topological_sort(tasks):
    """Sort tasks respecting depends_on_id (dependencies first)."""
    id_map = {t.id: t for t in tasks}
    visited = set()
    order = []

    def visit(t):
        if t.id in visited:
            return
        visited.add(t.id)
        if t.depends_on_id and t.depends_on_id in id_map:
            visit(id_map[t.depends_on_id])
        order.append(t)

    for t in tasks:
        visit(t)
    return order


def _cluster_by_label(tasks):
    """Group tasks by their primary label to create focus blocks."""
    clusters: dict[str, list] = {}
    for t in tasks:
        key = (t.labels or "").split(",")[0].strip() or "_unlabelled"
        clusters.setdefault(key, []).append(t)
    return clusters


@router.post("/auto-plan", response_model=AutoPlanResponse)
def auto_plan(db: Session = Depends(get_db)):
    """One-click 'Auto Plan My Day' — generates a full daily schedule."""
    items, message, total_focus = _auto_plan_logic(db)
    return AutoPlanResponse(
        items=items,
        message=message,
        total_focus_minutes=total_focus,
    )


def _auto_plan_logic(db: Session) -> tuple[list[AutoPlanItem], str, int]:
    """Core scheduling logic, reusable by chat endpoint."""
    now = datetime.now(timezone.utc)
    start_of_day = datetime(now.year, now.month, now.day, 9, 0, tzinfo=timezone.utc)
    end_of_day = datetime(now.year, now.month, now.day, 18, 0, tzinfo=timezone.utc)

    if now >= end_of_day:
        start_of_day += timedelta(days=1)
        end_of_day += timedelta(days=1)
        current_time = start_of_day
    elif now > start_of_day:
        current_time = now.replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)
    else:
        current_time = start_of_day

    peak_hours = _detect_peak_hours(db)
    tasks = _get_open_tasks(db)
    tasks = _topological_sort(tasks)
    clusters = _cluster_by_label(tasks)

    high_energy_clusters = []
    other_clusters = []
    for label, cluster_tasks in clusters.items():
        has_high = any((t.energy_level or "").lower() == "high" for t in cluster_tasks)
        if has_high:
            high_energy_clusters.append((label, cluster_tasks))
        else:
            other_clusters.append((label, cluster_tasks))

    ordered_clusters = high_energy_clusters + other_clusters

    scheduled_items: list[AutoPlanItem] = []
    total_focus = 0

    for label, cluster_tasks in ordered_clusters:
        cluster_tasks.sort(
            key=lambda t: PRIORITY_MAP.get(t.priority or "low", 1), reverse=True
        )

        is_high_cluster = any((t.energy_level or "").lower() == "high" for t in cluster_tasks)
        if is_high_cluster and current_time.hour not in peak_hours:
            lookahead = current_time
            while lookahead < end_of_day:
                if lookahead.hour in peak_hours:
                    current_time = lookahead
                    break
                lookahead += timedelta(minutes=30)

        block_label = label if label != "_unlabelled" else None

        for t in cluster_tasks:
            if current_time >= end_of_day:
                break

            duration = t.duration_minutes or 30
            end_time = current_time + timedelta(minutes=duration)

            if end_time > end_of_day:
                continue

            is_peak = current_time.hour in peak_hours
            is_high = (t.energy_level or "").lower() == "high"

            if is_peak and is_high:
                rationale = "🔥 Peak productivity hour — high-energy task"
            elif block_label:
                rationale = f"📦 Focus block: {block_label}"
            else:
                rationale = None

            scheduled_items.append(
                AutoPlanItem(
                    task_id=t.id,
                    title=t.title,
                    start_time=current_time.isoformat(),
                    end_time=end_time.isoformat(),
                    duration_minutes=duration,
                    block_label=block_label,
                    rationale=rationale,
                )
            )
            total_focus += duration
            current_time = end_time + timedelta(minutes=5)

        if current_time < end_of_day:
            current_time += timedelta(minutes=10)

    message = f"Auto-planned {len(scheduled_items)} tasks into focus blocks ({total_focus} min of deep work)."
    return scheduled_items, message, total_focus



@router.post("/reschedule", response_model=RescheduleResponse)
def reschedule_overdue(db: Session = Depends(get_db)):
    """Intelligently reschedule overdue tasks to the next available slots."""
    now = datetime.now(timezone.utc)

    overdue = (
        db.query(models.Task)
        .filter(
            models.Task.user_id == DEFAULT_USER_ID,
            models.Task.deleted_at.is_(None),
            models.Task.status != "done",
            models.Task.due_at.isnot(None),
            models.Task.due_at < now,
        )
        .order_by(models.Task.due_at)
        .all()
    )

    if not overdue:
        return RescheduleResponse(items=[], message="No overdue tasks to reschedule.")

    # Find next working day start
    next_day = datetime(now.year, now.month, now.day, 9, 0, tzinfo=timezone.utc)
    if now.hour >= 9:
        next_day += timedelta(days=1)
    # Skip weekends
    while next_day.weekday() >= 5:
        next_day += timedelta(days=1)

    rescheduled: list[RescheduleItem] = []
    slot = next_day

    # Sort by priority (high first)
    overdue.sort(
        key=lambda t: PRIORITY_MAP.get(t.priority or "low", 1), reverse=True
    )

    for t in overdue:
        days_overdue = (now - t.due_at).days if t.due_at else 0

        if days_overdue > 7:
            rationale = f"⚠️ {days_overdue} days overdue — urgent rescheduling"
        elif days_overdue > 3:
            rationale = f"📋 {days_overdue} days overdue — priority bump"
        else:
            rationale = "🔄 Rescheduled to next available slot"

        new_due = slot
        old_due = t.due_at.isoformat() if t.due_at else None

        # Update the task's due date
        t.due_at = new_due
        db.add(t)

        rescheduled.append(
            RescheduleItem(
                task_id=t.id,
                title=t.title,
                old_due=old_due,
                new_due=new_due.isoformat(),
                rationale=rationale,
            )
        )

        # Advance slot by task duration + buffer
        duration = t.duration_minutes or 30
        slot += timedelta(minutes=duration + 10)

        # If we've filled the day (past 18:00), move to next day
        if slot.hour >= 18:
            slot = slot.replace(hour=9, minute=0) + timedelta(days=1)
            while slot.weekday() >= 5:
                slot += timedelta(days=1)

    db.commit()

    return RescheduleResponse(
        items=rescheduled,
        message=f"Rescheduled {len(rescheduled)} overdue tasks.",
    )
