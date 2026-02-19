"""Team Workload Intelligence — Phase 3A.

CRUD for team members + workload analytics + AI assignment suggestions.
"""
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional

from app.db import SessionLocal
from app import models
from app.models.team_member import TeamMember

router = APIRouter(prefix="/v1/team", tags=["team"])
DEFAULT_USER_ID = 1


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── Schemas ───────────────────────────────────────────────────────

class TeamMemberCreate(BaseModel):
    name: str
    email: str
    role: Optional[str] = None
    capacity_hours_per_day: float = 8.0
    avatar_url: Optional[str] = None


class TeamMemberUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    capacity_hours_per_day: Optional[float] = None
    avatar_url: Optional[str] = None


def _serialize_member(m: TeamMember) -> dict:
    return {
        "id": m.id,
        "name": m.name,
        "email": m.email,
        "role": m.role,
        "capacity_hours_per_day": m.capacity_hours_per_day,
        "avatar_url": m.avatar_url,
        "created_at": m.created_at.isoformat() if m.created_at else None,
    }


# ── CRUD ──────────────────────────────────────────────────────────

@router.get("/members")
def list_members(db: Session = Depends(get_db)):
    members = db.query(TeamMember).order_by(TeamMember.name).all()
    return [_serialize_member(m) for m in members]


@router.post("/members", status_code=201)
def create_member(body: TeamMemberCreate, db: Session = Depends(get_db)):
    m = TeamMember(
        name=body.name,
        email=body.email,
        role=body.role,
        capacity_hours_per_day=body.capacity_hours_per_day,
        avatar_url=body.avatar_url,
    )
    db.add(m)
    db.commit()
    db.refresh(m)
    return _serialize_member(m)


@router.patch("/members/{member_id}")
def update_member(member_id: int, body: TeamMemberUpdate, db: Session = Depends(get_db)):
    m = db.get(TeamMember, member_id)
    if not m:
        raise HTTPException(status_code=404, detail="Member not found")
    for field, val in body.model_dump(exclude_unset=True).items():
        setattr(m, field, val)
    db.commit()
    db.refresh(m)
    return _serialize_member(m)


@router.delete("/members/{member_id}")
def delete_member(member_id: int, db: Session = Depends(get_db)):
    m = db.get(TeamMember, member_id)
    if not m:
        raise HTTPException(status_code=404, detail="Member not found")
    db.delete(m)
    db.commit()
    return {"status": "deleted"}


# ── Workload Distribution ─────────────────────────────────────────

@router.get("/workload")
def get_workload(db: Session = Depends(get_db)):
    """Per-member task counts, hours allocated, and utilization percentage."""
    members = db.query(TeamMember).all()

    workload = []
    for m in members:
        # Count assigned open tasks
        assigned_tasks = (
            db.query(models.Task)
            .filter(
                models.Task.assigned_to == m.id,
                models.Task.deleted_at.is_(None),
                models.Task.status != "done",
            )
            .all()
        )
        total_minutes = sum(t.duration_minutes or 30 for t in assigned_tasks)
        total_hours = round(total_minutes / 60, 1)
        utilization = round((total_hours / m.capacity_hours_per_day) * 100, 1) if m.capacity_hours_per_day > 0 else 0

        workload.append({
            "member": _serialize_member(m),
            "task_count": len(assigned_tasks),
            "allocated_hours": total_hours,
            "capacity_hours": m.capacity_hours_per_day,
            "utilization_pct": min(utilization, 200),  # cap at 200% for display
            "status": "overloaded" if utilization > 100 else "balanced" if utilization > 50 else "available",
        })

    # Sort by utilization descending
    workload.sort(key=lambda w: w["utilization_pct"], reverse=True)
    return workload


# ── AI Assignment Suggestions ─────────────────────────────────────

@router.post("/suggest-assignments")
def suggest_assignments(db: Session = Depends(get_db)):
    """AI-balanced task distribution: assign unassigned tasks to least-loaded members."""
    members = db.query(TeamMember).all()
    if not members:
        return {"suggestions": [], "message": "No team members configured."}

    unassigned = (
        db.query(models.Task)
        .filter(
            models.Task.user_id == DEFAULT_USER_ID,
            models.Task.deleted_at.is_(None),
            models.Task.status != "done",
            models.Task.assigned_to.is_(None),
        )
        .order_by(models.Task.due_at.asc().nullslast())
        .limit(20)
        .all()
    )

    if not unassigned:
        return {"suggestions": [], "message": "All tasks are already assigned!"}

    # Build current load map
    load_map: dict[int, float] = {}
    for m in members:
        assigned_mins = (
            db.query(func.coalesce(func.sum(models.Task.duration_minutes), 0))
            .filter(
                models.Task.assigned_to == m.id,
                models.Task.deleted_at.is_(None),
                models.Task.status != "done",
            )
            .scalar()
        )
        load_map[m.id] = assigned_mins / 60.0  # hours

    member_map = {m.id: m for m in members}
    suggestions = []

    for task in unassigned:
        # Find least-loaded member with available capacity
        best_id = min(load_map, key=lambda mid: load_map[mid] / (member_map[mid].capacity_hours_per_day or 8))
        best = member_map[best_id]

        task_hours = (task.duration_minutes or 30) / 60.0
        current_util = round((load_map[best_id] / best.capacity_hours_per_day) * 100, 1)

        suggestions.append({
            "task_id": task.id,
            "task_title": task.title,
            "task_priority": task.priority,
            "suggested_member_id": best.id,
            "suggested_member_name": best.name,
            "rationale": f"Lowest utilization ({current_util}%) — {load_map[best_id]:.1f}h / {best.capacity_hours_per_day}h capacity",
        })

        # Update load map for next iteration
        load_map[best_id] += task_hours

    return {
        "suggestions": suggestions,
        "message": f"Generated {len(suggestions)} assignment suggestions.",
    }


# ── Apply Assignments ─────────────────────────────────────────────

@router.post("/assign")
def assign_task(task_id: int, member_id: int, db: Session = Depends(get_db)):
    """Assign a task to a team member."""
    task = db.get(models.Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    member = db.get(TeamMember, member_id)
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    task.assigned_to = member_id
    db.commit()
    return {"task_id": task_id, "assigned_to": member_id, "member_name": member.name}
