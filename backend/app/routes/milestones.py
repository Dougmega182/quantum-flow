"""Milestones CRUD — Phase 2C.

GET    /v1/milestones              → list milestones (optionally filtered by project_id)
POST   /v1/milestones              → create
PATCH  /v1/milestones/{id}         → update
POST   /v1/milestones/{id}/complete → mark complete
DELETE /v1/milestones/{id}         → delete
"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from app.db import SessionLocal
from app.models.milestone import Milestone

router = APIRouter(prefix="/v1/milestones", tags=["milestones"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class MilestoneCreate(BaseModel):
    project_id: int
    title: str
    due_at: Optional[str] = None


class MilestoneUpdate(BaseModel):
    title: Optional[str] = None
    due_at: Optional[str] = None


@router.get("")
def list_milestones(project_id: Optional[int] = None, db: Session = Depends(get_db)):
    q = db.query(Milestone)
    if project_id:
        q = q.filter(Milestone.project_id == project_id)
    milestones = q.order_by(Milestone.due_at.asc().nullslast()).all()
    return [
        {
            "id": m.id,
            "project_id": m.project_id,
            "title": m.title,
            "due_at": m.due_at.isoformat() if m.due_at else None,
            "completed_at": m.completed_at.isoformat() if m.completed_at else None,
            "created_at": m.created_at.isoformat(),
        }
        for m in milestones
    ]


@router.post("", status_code=201)
def create_milestone(body: MilestoneCreate, db: Session = Depends(get_db)):
    m = Milestone(
        project_id=body.project_id,
        title=body.title,
        due_at=datetime.fromisoformat(body.due_at) if body.due_at else None,
    )
    db.add(m)
    db.commit()
    db.refresh(m)
    return {
        "id": m.id, "project_id": m.project_id, "title": m.title,
        "due_at": m.due_at.isoformat() if m.due_at else None,
        "completed_at": None, "created_at": m.created_at.isoformat(),
    }


@router.patch("/{milestone_id}")
def update_milestone(milestone_id: int, body: MilestoneUpdate, db: Session = Depends(get_db)):
    m = db.get(Milestone, milestone_id)
    if not m:
        raise HTTPException(status_code=404, detail="Milestone not found")
    if body.title is not None:
        m.title = body.title
    if body.due_at is not None:
        m.due_at = datetime.fromisoformat(body.due_at)
    db.commit()
    db.refresh(m)
    return {
        "id": m.id, "project_id": m.project_id, "title": m.title,
        "due_at": m.due_at.isoformat() if m.due_at else None,
        "completed_at": m.completed_at.isoformat() if m.completed_at else None,
    }


@router.post("/{milestone_id}/complete")
def complete_milestone(milestone_id: int, db: Session = Depends(get_db)):
    m = db.get(Milestone, milestone_id)
    if not m:
        raise HTTPException(status_code=404, detail="Milestone not found")
    m.completed_at = datetime.utcnow()
    db.commit()
    return {"id": m.id, "title": m.title, "completed_at": m.completed_at.isoformat()}


@router.delete("/{milestone_id}")
def delete_milestone(milestone_id: int, db: Session = Depends(get_db)):
    m = db.get(Milestone, milestone_id)
    if not m:
        raise HTTPException(status_code=404, detail="Milestone not found")
    db.delete(m)
    db.commit()
    return {"status": "deleted"}
