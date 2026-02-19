"""Energy-Aware Scheduling — Phase 2B.

POST /v1/ai/learn-energy  →  Scan completions, update hourly productivity scores.
GET  /v1/ai/energy-profile →  Return 24-hour productivity heatmap.
"""
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db import SessionLocal
from app import models
from app.models.energy_profile import EnergyProfile

router = APIRouter(prefix="/v1/ai", tags=["ai"])
DEFAULT_USER_ID = 1


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/learn-energy")
def learn_energy(db: Session = Depends(get_db)):
    """Scan completed tasks from the last 30 days and update the energy profile."""
    last_month = datetime.utcnow() - timedelta(days=30)

    # Get completion counts per hour
    hourly_stats = (
        db.query(
            func.extract("hour", models.Task.completed_at).label("hour"),
            func.count(models.Task.id).label("count"),
        )
        .filter(
            models.Task.user_id == DEFAULT_USER_ID,
            models.Task.status == "done",
            models.Task.completed_at >= last_month,
            models.Task.completed_at.isnot(None),
        )
        .group_by(func.extract("hour", models.Task.completed_at))
        .all()
    )

    if not hourly_stats:
        return {"message": "No completed tasks found in the last 30 days.", "updated": 0}

    max_count = max(s.count for s in hourly_stats)

    updated = 0
    for stat in hourly_stats:
        hour = int(stat.hour)
        score = round(stat.count / max_count, 3) if max_count > 0 else 0.0

        profile = (
            db.query(EnergyProfile)
            .filter(EnergyProfile.user_id == DEFAULT_USER_ID, EnergyProfile.hour == hour)
            .first()
        )

        if profile:
            # Exponential moving average for smooth learning
            alpha = 0.3
            profile.productivity_score = round(
                alpha * score + (1 - alpha) * profile.productivity_score, 3
            )
            profile.sample_count += stat.count
        else:
            profile = EnergyProfile(
                user_id=DEFAULT_USER_ID,
                hour=hour,
                productivity_score=score,
                sample_count=stat.count,
            )
            db.add(profile)
        updated += 1

    db.commit()
    return {"message": f"Updated energy profile for {updated} hours.", "updated": updated}


@router.get("/energy-profile")
def get_energy_profile(db: Session = Depends(get_db)):
    """Return 24-hour productivity heatmap for the user."""
    profiles = (
        db.query(EnergyProfile)
        .filter(EnergyProfile.user_id == DEFAULT_USER_ID)
        .order_by(EnergyProfile.hour)
        .all()
    )

    # Build full 24-hour map, filling gaps with 0
    heatmap = []
    profile_map = {p.hour: p for p in profiles}

    for h in range(24):
        p = profile_map.get(h)
        heatmap.append({
            "hour": h,
            "label": f"{h:02d}:00",
            "score": p.productivity_score if p else 0.0,
            "samples": p.sample_count if p else 0,
        })

    # Detect peak hours (>= 70% of max score)
    max_score = max((x["score"] for x in heatmap), default=0)
    peak_hours = [x["hour"] for x in heatmap if x["score"] >= max_score * 0.7 and x["score"] > 0]

    return {
        "heatmap": heatmap,
        "peak_hours": peak_hours,
        "total_samples": sum(x["samples"] for x in heatmap),
    }
