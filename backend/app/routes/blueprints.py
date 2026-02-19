"""Workflow Blueprints — Phase 3B.

CRUD for blueprints, one-click instantiation, and 4 built-in blueprints.
"""
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from app.db import SessionLocal
from app import models
from app.models.workflow_blueprint import WorkflowBlueprint

router = APIRouter(prefix="/v1/blueprints", tags=["blueprints"])
DEFAULT_USER_ID = 1


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── Built-in blueprint definitions ───────────────────────────────

BUILTINS = [
    {
        "title": "Sprint Planning",
        "description": "Agile sprint kickoff workflow — define goals, estimate tasks, assign owners.",
        "category": "Engineering",
        "steps": [
            {"title": "Define sprint goal", "order": 1, "duration_minutes": 30, "energy_level": "high"},
            {"title": "Review backlog & prioritize", "order": 2, "duration_minutes": 45, "energy_level": "high", "depends_on_step": 1},
            {"title": "Estimate story points", "order": 3, "duration_minutes": 30, "energy_level": "medium", "depends_on_step": 2},
            {"title": "Assign tasks to team", "order": 4, "duration_minutes": 20, "energy_level": "low", "depends_on_step": 3},
            {"title": "Create sprint board", "order": 5, "duration_minutes": 15, "energy_level": "low", "depends_on_step": 4},
        ],
    },
    {
        "title": "Weekly Review",
        "description": "End-of-week reflection and planning cycle.",
        "category": "Productivity",
        "steps": [
            {"title": "Review completed tasks", "order": 1, "duration_minutes": 20, "energy_level": "medium"},
            {"title": "Identify blockers & lessons learned", "order": 2, "duration_minutes": 15, "energy_level": "high", "depends_on_step": 1},
            {"title": "Update project status", "order": 3, "duration_minutes": 10, "energy_level": "low", "depends_on_step": 2},
            {"title": "Plan next week priorities", "order": 4, "duration_minutes": 25, "energy_level": "high", "depends_on_step": 3},
        ],
    },
    {
        "title": "Content Pipeline",
        "description": "End-to-end content creation from ideation to publish.",
        "category": "Marketing",
        "steps": [
            {"title": "Brainstorm content ideas", "order": 1, "duration_minutes": 30, "energy_level": "high"},
            {"title": "Research & outline", "order": 2, "duration_minutes": 45, "energy_level": "high", "depends_on_step": 1},
            {"title": "Write first draft", "order": 3, "duration_minutes": 90, "energy_level": "high", "depends_on_step": 2},
            {"title": "Edit & proofread", "order": 4, "duration_minutes": 30, "energy_level": "medium", "depends_on_step": 3},
            {"title": "Create visuals", "order": 5, "duration_minutes": 45, "energy_level": "medium", "depends_on_step": 3},
            {"title": "Publish & promote", "order": 6, "duration_minutes": 20, "energy_level": "low", "depends_on_step": 4},
        ],
    },
    {
        "title": "Client Onboarding",
        "description": "New client setup checklist — from kickoff to handoff.",
        "category": "Operations",
        "steps": [
            {"title": "Send welcome email", "order": 1, "duration_minutes": 10, "energy_level": "low"},
            {"title": "Schedule kickoff call", "order": 2, "duration_minutes": 15, "energy_level": "low", "depends_on_step": 1},
            {"title": "Gather requirements", "order": 3, "duration_minutes": 60, "energy_level": "high", "depends_on_step": 2},
            {"title": "Set up project environment", "order": 4, "duration_minutes": 30, "energy_level": "medium", "depends_on_step": 3},
            {"title": "Share access credentials", "order": 5, "duration_minutes": 10, "energy_level": "low", "depends_on_step": 4},
            {"title": "Deliver onboarding guide", "order": 6, "duration_minutes": 20, "energy_level": "medium", "depends_on_step": 5},
        ],
    },
]


# ── Schemas ───────────────────────────────────────────────────────

class BlueprintCreate(BaseModel):
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    steps: list[dict] = []


class BlueprintUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    steps: Optional[list[dict]] = None


def _serialize(bp: WorkflowBlueprint) -> dict:
    return {
        "id": bp.id,
        "title": bp.title,
        "description": bp.description,
        "category": bp.category,
        "steps": json.loads(bp.steps_json) if bp.steps_json else [],
        "is_builtin": bool(bp.is_builtin),
        "created_at": bp.created_at.isoformat() if bp.created_at else None,
    }


# ── Seed builtins on startup ─────────────────────────────────────

@router.on_event("startup")
async def seed_builtins():
    db = SessionLocal()
    try:
        existing = db.query(WorkflowBlueprint).filter(WorkflowBlueprint.is_builtin == 1).count()
        if existing == 0:
            for bp_def in BUILTINS:
                bp = WorkflowBlueprint(
                    title=bp_def["title"],
                    description=bp_def["description"],
                    category=bp_def["category"],
                    steps_json=json.dumps(bp_def["steps"]),
                    is_builtin=1,
                )
                db.add(bp)
            db.commit()
    finally:
        db.close()


# ── CRUD ──────────────────────────────────────────────────────────

@router.get("")
def list_blueprints(category: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(WorkflowBlueprint)
    if category:
        q = q.filter(WorkflowBlueprint.category == category)
    return [_serialize(bp) for bp in q.order_by(WorkflowBlueprint.title).all()]


@router.get("/{blueprint_id}")
def get_blueprint(blueprint_id: int, db: Session = Depends(get_db)):
    bp = db.get(WorkflowBlueprint, blueprint_id)
    if not bp:
        raise HTTPException(status_code=404, detail="Blueprint not found")
    return _serialize(bp)


@router.post("", status_code=201)
def create_blueprint(body: BlueprintCreate, db: Session = Depends(get_db)):
    bp = WorkflowBlueprint(
        title=body.title,
        description=body.description,
        category=body.category,
        steps_json=json.dumps(body.steps),
        is_builtin=0,
    )
    db.add(bp)
    db.commit()
    db.refresh(bp)
    return _serialize(bp)


@router.patch("/{blueprint_id}")
def update_blueprint(blueprint_id: int, body: BlueprintUpdate, db: Session = Depends(get_db)):
    bp = db.get(WorkflowBlueprint, blueprint_id)
    if not bp:
        raise HTTPException(status_code=404, detail="Blueprint not found")
    if body.title is not None:
        bp.title = body.title
    if body.description is not None:
        bp.description = body.description
    if body.category is not None:
        bp.category = body.category
    if body.steps is not None:
        bp.steps_json = json.dumps(body.steps)
    db.commit()
    db.refresh(bp)
    return _serialize(bp)


@router.delete("/{blueprint_id}")
def delete_blueprint(blueprint_id: int, db: Session = Depends(get_db)):
    bp = db.get(WorkflowBlueprint, blueprint_id)
    if not bp:
        raise HTTPException(status_code=404, detail="Blueprint not found")
    db.delete(bp)
    db.commit()
    return {"status": "deleted"}


# ── Instantiate ───────────────────────────────────────────────────

@router.post("/{blueprint_id}/instantiate")
def instantiate_blueprint(
    blueprint_id: int,
    project_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    """Create real tasks from a blueprint's steps, preserving dependencies."""
    bp = db.get(WorkflowBlueprint, blueprint_id)
    if not bp:
        raise HTTPException(status_code=404, detail="Blueprint not found")

    steps = json.loads(bp.steps_json) if bp.steps_json else []
    if not steps:
        raise HTTPException(status_code=400, detail="Blueprint has no steps")

    # Map step order → created task id for dependency wiring
    order_to_task_id: dict[int, int] = {}
    created_tasks = []

    for step in sorted(steps, key=lambda s: s.get("order", 0)):
        depends_on_step = step.get("depends_on_step")
        parent_task_id = order_to_task_id.get(depends_on_step) if depends_on_step else None

        task = models.Task(
            user_id=DEFAULT_USER_ID,
            title=f"[{bp.title}] {step['title']}",
            description=f"Auto-generated from blueprint: {bp.title}",
            status="open",
            priority="medium",
            duration_minutes=step.get("duration_minutes", 30),
            energy_level=step.get("energy_level", "medium"),
            depends_on_id=parent_task_id,
            labels=bp.category or "",
        )
        db.add(task)
        db.flush()  # get the id
        order_to_task_id[step["order"]] = task.id
        created_tasks.append({
            "task_id": task.id,
            "title": task.title,
            "order": step["order"],
            "depends_on_task_id": parent_task_id,
        })

    db.commit()

    return {
        "blueprint": bp.title,
        "tasks_created": len(created_tasks),
        "tasks": created_tasks,
        "message": f"Created {len(created_tasks)} tasks from '{bp.title}' blueprint.",
    }
