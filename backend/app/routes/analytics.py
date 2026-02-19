from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db import SessionLocal
from app import models
from datetime import datetime, timedelta
from app.auth import require_api_key

router = APIRouter(prefix="/v1/analytics", tags=["analytics"])
DEFAULT_USER_ID = 1

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/stats", dependencies=[Depends(require_api_key)])
def get_stats(db: Session = Depends(get_db)):
    # Total tasks (not deleted)
    total = db.query(models.Task).filter(models.Task.deleted_at.is_(None)).count()
    completed = db.query(models.Task).filter(models.Task.status == "done", models.Task.deleted_at.is_(None)).count()
    
    # Energy distribution
    energy_stats = db.query(models.Task.energy_level, func.count(models.Task.id))\
        .filter(models.Task.deleted_at.is_(None))\
        .group_by(models.Task.energy_level).all()
    
    energy_dist = {str(k or "none"): v for k, v in energy_stats}
    
    # Weekly Focus (last 7 days completed tasks)
    last_week = datetime.utcnow() - timedelta(days=7)
    weekly_completed = db.query(func.date(models.Task.completed_at), func.count(models.Task.id))\
        .filter(models.Task.status == "done", models.Task.completed_at >= last_week)\
        .group_by(func.date(models.Task.completed_at)).all()
    
    # Focus Heatmap (completions by hour over last 30 days)
    last_month = datetime.utcnow() - timedelta(days=30)
    hourly_completions = db.query(func.extract('hour', models.Task.completed_at), func.count(models.Task.id))\
        .filter(models.Task.status == "done", models.Task.completed_at >= last_month)\
        .group_by(func.extract('hour', models.Task.completed_at)).all()
    
    heatmap = {int(h): c for h, c in hourly_completions}
    # Ensure all 24 hours are represented
    full_heatmap = {h: heatmap.get(h, 0) for h in range(24)}
    
    # Map to daily counts
    focus_data = {str(d): c for d, c in weekly_completed}
    
    return {
        "total_tasks": total,
        "completed_tasks": completed,
        "completion_rate": (completed / total * 100) if total > 0 else 0,
        "energy_distribution": energy_dist,
        "weekly_focus": focus_data,
        "focus_heatmap": full_heatmap
    }


@router.get("/deep", dependencies=[Depends(require_api_key)])
def get_deep_analytics(db: Session = Depends(get_db)):
    """Advanced analytics: streaks, velocity, priority breakdown, comparison periods."""
    now = datetime.utcnow()

    # ── Streaks ───────────────────────────────────────────────
    completed_dates_q = (
        db.query(func.date(models.Task.completed_at))
        .filter(models.Task.status == "done", models.Task.completed_at.isnot(None))
        .distinct()
        .order_by(func.date(models.Task.completed_at).desc())
        .all()
    )
    completed_dates = sorted([d[0] for d in completed_dates_q], reverse=True)

    current_streak = 0
    best_streak = 0
    streak = 0
    today = now.date()

    for i, d in enumerate(completed_dates):
        expected = today - timedelta(days=i)
        if d == expected:
            streak += 1
        else:
            if i == 0:
                # Missed today, check if yesterday started
                if d == today - timedelta(days=1):
                    streak = 1
                    continue
            break
    current_streak = streak

    # Best streak (scan all)
    streak = 1
    for i in range(1, len(completed_dates)):
        if completed_dates[i - 1] - completed_dates[i] == timedelta(days=1):
            streak += 1
        else:
            best_streak = max(best_streak, streak)
            streak = 1
    best_streak = max(best_streak, streak)

    # ── Velocity (tasks/day over 30 days) ─────────────────────
    last_30 = now - timedelta(days=30)
    daily_counts = (
        db.query(func.date(models.Task.completed_at), func.count(models.Task.id))
        .filter(models.Task.status == "done", models.Task.completed_at >= last_30)
        .group_by(func.date(models.Task.completed_at))
        .order_by(func.date(models.Task.completed_at))
        .all()
    )
    velocity_trend = [{"date": str(d), "count": c} for d, c in daily_counts]
    avg_velocity = round(sum(v["count"] for v in velocity_trend) / max(len(velocity_trend), 1), 1)

    # ── Priority Breakdown ────────────────────────────────────
    priority_stats = (
        db.query(models.Task.priority, func.count(models.Task.id))
        .filter(models.Task.deleted_at.is_(None))
        .group_by(models.Task.priority)
        .all()
    )
    priority_breakdown = {str(p or "none"): c for p, c in priority_stats}

    # ── Avg Completion Time (hours) ───────────────────────────
    from sqlalchemy import extract
    completed_tasks = (
        db.query(models.Task)
        .filter(
            models.Task.status == "done",
            models.Task.completed_at.isnot(None),
            models.Task.created_at.isnot(None),
        )
        .limit(200)
        .all()
    )
    if completed_tasks:
        deltas = [(t.completed_at - t.created_at).total_seconds() / 3600 for t in completed_tasks if t.completed_at and t.created_at]
        avg_completion_hours = round(sum(deltas) / max(len(deltas), 1), 1)
    else:
        avg_completion_hours = 0

    # ── This Week vs Last Week ────────────────────────────────
    week_start = today - timedelta(days=today.weekday())
    last_week_start = week_start - timedelta(days=7)

    this_week_count = (
        db.query(func.count(models.Task.id))
        .filter(models.Task.status == "done", models.Task.completed_at >= str(week_start))
        .scalar()
    )
    last_week_count = (
        db.query(func.count(models.Task.id))
        .filter(
            models.Task.status == "done",
            models.Task.completed_at >= str(last_week_start),
            models.Task.completed_at < str(week_start),
        )
        .scalar()
    )

    return {
        "streaks": {"current": current_streak, "best": best_streak},
        "velocity": {"trend": velocity_trend, "avg_per_day": avg_velocity},
        "priority_breakdown": priority_breakdown,
        "avg_completion_hours": avg_completion_hours,
        "comparison": {
            "this_week": this_week_count or 0,
            "last_week": last_week_count or 0,
            "change_pct": round(((this_week_count - last_week_count) / max(last_week_count, 1)) * 100, 1) if last_week_count else 0,
        },
    }
