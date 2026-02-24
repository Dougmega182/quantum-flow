"""Activity Feed — Phase 5C.

List recent activities with filtering.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Optional

from app.db import SessionLocal
from app.models.activity import Activity

router = APIRouter(prefix="/v1/activity", tags=["activity"])
DEFAULT_USER_ID = 1


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _serialize(a: Activity) -> dict:
    return {
        "id": a.id,
        "action": a.action,
        "entity_type": a.entity_type,
        "entity_id": a.entity_id,
        "entity_title": a.entity_title,
        "metadata": a.metadata_json,
        "created_at": a.created_at.isoformat() if a.created_at else None,
    }


@router.get("")
def list_activity(
    limit: int = 30,
    entity_type: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """List recent activities, newest first."""
    q = db.query(Activity).filter(Activity.user_id == DEFAULT_USER_ID)
    if entity_type:
        q = q.filter(Activity.entity_type == entity_type)
    activities = q.order_by(Activity.created_at.desc()).limit(limit).all()
    return {"activities": [_serialize(a) for a in activities]}
