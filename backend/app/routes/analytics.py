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
