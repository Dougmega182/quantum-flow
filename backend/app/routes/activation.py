"""Activation Intelligence™ — The Starting Engine

Routes for:
- Friction scoring (deterministic + LLM classification)
- "Help Me Start" mode (micro-step generation)
- Avoidance detection / tracking
- Intervention logging
- Activation event logging
"""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional
from app.db import SessionLocal
from app import models

router = APIRouter(prefix="/v1/activation", tags=["activation"])
DEFAULT_USER_ID = 1


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── Schemas ──────────────────────────────────────────────────

class FrictionResponse(BaseModel):
    task_id: int
    friction_score: float
    emotional_weight: float
    cognitive_load_tag: str
    ambiguity_level: float
    micro_step: Optional[str] = None


class StartMeResponse(BaseModel):
    task_id: int
    task_title: str
    friction_score: float
    micro_step: str
    intervention_type: str
    countdown_seconds: int


class InterventionLog(BaseModel):
    task_id: int
    intervention_type: str  # countdown, body_double, shrink, script, micro_start
    outcome: str            # started, skipped, dismissed, completed
    start_latency_seconds: Optional[int] = None


class ActivationEventLog(BaseModel):
    task_id: Optional[int] = None
    event_type: str
    metadata: Optional[dict] = None


# ── Friction Scoring ─────────────────────────────────────────

COGNITIVE_LOAD_MAP = {"deep": 10, "admin": 4, "light": 2, "creative": 7}


def compute_friction(task: models.Task) -> float:
    """Deterministic friction formula from the bible:
    Friction = (Ambiguity × 0.3) + (Emotional Weight × 0.4) + (Cognitive Load × 0.2) + (History Avoidance × 0.5)
    Normalized to 1-10 scale.
    """
    ambiguity = task.ambiguity_level or 3.0
    emotional = task.emotional_weight or 3.0
    cognitive = COGNITIVE_LOAD_MAP.get(task.cognitive_load_tag or "admin", 4)
    avoidance_history = min((task.reschedule_count or 0) + (task.avoidance_count or 0), 10)

    raw = (ambiguity * 0.3) + (emotional * 0.4) + (cognitive * 0.2) + (avoidance_history * 0.5)
    # Normalize: raw max ≈ 3+4+2+5 = 14, min ≈ 0.3+0.4+0.4+0 = 1.1
    score = max(1.0, min(10.0, (raw / 14.0) * 10.0))
    return round(score, 1)


def generate_micro_step(title: str, description: str = "") -> str:
    """Generate a micro-step for the task.
    Phase 1: deterministic templates. Phase 2: LLM-powered.
    """
    title_lower = title.lower()

    # Pattern matching for common task types
    if any(w in title_lower for w in ["call", "phone", "ring"]):
        return f"Open your phone contacts. Search for the person. Do not call yet — just find the number."
    elif any(w in title_lower for w in ["email", "write", "send", "message"]):
        return f"Open your email. Start a blank draft. Type only the subject line."
    elif any(w in title_lower for w in ["clean", "organize", "tidy"]):
        return f"Pick up exactly 3 items. Put them where they belong. Stop there."
    elif any(w in title_lower for w in ["report", "document", "write"]):
        return f"Open a blank document. Type the title only. Save it."
    elif any(w in title_lower for w in ["meeting", "schedule", "book"]):
        return f"Open your calendar. Look at available slots tomorrow. Don't book yet."
    elif any(w in title_lower for w in ["code", "bug", "fix", "implement"]):
        return f"Open the file you need to change. Read the first 10 lines. Don't edit yet."
    elif any(w in title_lower for w in ["research", "find", "look"]):
        return f"Open a browser tab. Type one search query. Read the first result only."
    else:
        return f"Set a 3-minute timer. Open what you need for '{title}'. Just look at it."


# ── Routes ───────────────────────────────────────────────────

@router.post("/score/{task_id}", response_model=FrictionResponse)
def score_task(task_id: int, db: Session = Depends(get_db)):
    """Score a task's friction level and generate a micro-step."""
    task = db.query(models.Task).filter(
        models.Task.id == task_id,
        models.Task.user_id == DEFAULT_USER_ID
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Auto-classify if missing
    if not task.cognitive_load_tag:
        task.cognitive_load_tag = _classify_cognitive_load(task.title)
    if not task.emotional_weight:
        task.emotional_weight = _estimate_emotional_weight(task.title)
    if not task.ambiguity_level:
        task.ambiguity_level = _estimate_ambiguity(task.title, task.description)

    # Compute friction
    task.friction_score = compute_friction(task)

    # Generate micro-step
    task.micro_step = generate_micro_step(task.title, task.description or "")

    db.commit()

    return FrictionResponse(
        task_id=task.id,
        friction_score=task.friction_score,
        emotional_weight=task.emotional_weight or 3.0,
        cognitive_load_tag=task.cognitive_load_tag or "admin",
        ambiguity_level=task.ambiguity_level or 3.0,
        micro_step=task.micro_step,
    )


@router.get("/help-me-start", response_model=StartMeResponse)
def help_me_start(db: Session = Depends(get_db)):
    """The core "Help Me Start" endpoint.
    Selects the optimal task to start and returns it with a micro-step + intervention.
    """
    # Get all open, non-deleted tasks
    tasks = db.query(models.Task).filter(
        models.Task.user_id == DEFAULT_USER_ID,
        models.Task.status.in_(["open", "in_progress"]),
        models.Task.deleted_at.is_(None),
    ).all()

    if not tasks:
        raise HTTPException(status_code=404, detail="No tasks available. Create one first!")

    # Score all unscored tasks
    for t in tasks:
        if t.friction_score is None:
            if not t.cognitive_load_tag:
                t.cognitive_load_tag = _classify_cognitive_load(t.title)
            if not t.emotional_weight:
                t.emotional_weight = _estimate_emotional_weight(t.title)
            if not t.ambiguity_level:
                t.ambiguity_level = _estimate_ambiguity(t.title, t.description)
            t.friction_score = compute_friction(t)
            t.micro_step = generate_micro_step(t.title, t.description or "")

    db.commit()

    # Selection strategy: find the task with LOWEST friction that's due soonest
    # This gives the brain its "guaranteed win"
    now = datetime.now(timezone.utc)

    def sort_key(t):
        overdue_boost = -100 if (t.due_at and t.due_at < now) else 0
        priority_boost = {"high": -20, "medium": -10, "low": 0}.get(t.priority or "low", 0)
        return (t.friction_score or 5) + overdue_boost + priority_boost

    tasks.sort(key=sort_key)
    chosen = tasks[0]

    # Determine intervention type based on friction
    if (chosen.friction_score or 5) >= 7:
        intervention = "shrink"  # high friction → break it down
        countdown = 120          # 2-minute rule
    elif (chosen.friction_score or 5) >= 4:
        intervention = "countdown"
        countdown = 180          # 3-minute countdown
    else:
        intervention = "micro_start"
        countdown = 90           # 90-second just-start

    # Log activation event
    event = models.ActivationEvent(
        user_id=DEFAULT_USER_ID,
        task_id=chosen.id,
        event_type="help_me_start",
        friction_score_at_event=chosen.friction_score,
    )
    db.add(event)
    db.commit()

    return StartMeResponse(
        task_id=chosen.id,
        task_title=chosen.title,
        friction_score=chosen.friction_score or 5.0,
        micro_step=chosen.micro_step or generate_micro_step(chosen.title),
        intervention_type=intervention,
        countdown_seconds=countdown,
    )


@router.post("/log-intervention")
def log_intervention(body: InterventionLog, db: Session = Depends(get_db)):
    """Log the result of an intervention (did the user start?)."""
    intv = models.Intervention(
        user_id=DEFAULT_USER_ID,
        task_id=body.task_id,
        intervention_type=body.intervention_type,
        outcome=body.outcome,
        started_after_seconds=body.start_latency_seconds,
    )
    db.add(intv)

    # Also log as activation event
    event = models.ActivationEvent(
        user_id=DEFAULT_USER_ID,
        task_id=body.task_id,
        event_type=f"intervention_{body.outcome}",
        start_latency_seconds=body.start_latency_seconds,
        metadata_json={"intervention_type": body.intervention_type},
    )
    db.add(event)

    # Update avoidance count if skipped/dismissed
    if body.outcome in ("skipped", "dismissed"):
        task = db.query(models.Task).filter(models.Task.id == body.task_id).first()
        if task:
            task.avoidance_count = (task.avoidance_count or 0) + 1
            task.friction_score = compute_friction(task)  # recalculate

    db.commit()
    return {"status": "logged"}


@router.post("/log-event")
def log_event(body: ActivationEventLog, db: Session = Depends(get_db)):
    """Log a generic activation event."""
    event = models.ActivationEvent(
        user_id=DEFAULT_USER_ID,
        task_id=body.task_id,
        event_type=body.event_type,
        metadata_json=body.metadata,
    )
    db.add(event)
    db.commit()
    return {"status": "logged"}


@router.post("/task-opened/{task_id}")
def track_task_opened(task_id: int, db: Session = Depends(get_db)):
    """Track when a user opens/views a task without starting it."""
    task = db.query(models.Task).filter(
        models.Task.id == task_id,
        models.Task.user_id == DEFAULT_USER_ID
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    task.last_opened_at = datetime.now(timezone.utc)
    event = models.ActivationEvent(
        user_id=DEFAULT_USER_ID,
        task_id=task_id,
        event_type="task_opened",
        friction_score_at_event=task.friction_score,
    )
    db.add(event)
    db.commit()
    return {"status": "tracked"}


@router.post("/task-rescheduled/{task_id}")
def track_reschedule(task_id: int, db: Session = Depends(get_db)):
    """Increment reschedule counter and recalculate friction."""
    task = db.query(models.Task).filter(
        models.Task.id == task_id,
        models.Task.user_id == DEFAULT_USER_ID
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    task.reschedule_count = (task.reschedule_count or 0) + 1
    task.friction_score = compute_friction(task)

    event = models.ActivationEvent(
        user_id=DEFAULT_USER_ID,
        task_id=task_id,
        event_type="task_rescheduled",
        friction_score_at_event=task.friction_score,
        metadata_json={"reschedule_count": task.reschedule_count},
    )
    db.add(event)
    db.commit()
    return {"friction_score": task.friction_score, "reschedule_count": task.reschedule_count}


@router.get("/stats")
def activation_stats(db: Session = Depends(get_db)):
    """Activation Analytics — metrics from the bible.
    Start latency, shrink frequency, avoidance loops, completion after intervention.
    """
    total_events = db.query(func.count(models.ActivationEvent.id)).filter(
        models.ActivationEvent.user_id == DEFAULT_USER_ID
    ).scalar() or 0

    total_interventions = db.query(func.count(models.Intervention.id)).filter(
        models.Intervention.user_id == DEFAULT_USER_ID
    ).scalar() or 0

    successful_starts = db.query(func.count(models.Intervention.id)).filter(
        models.Intervention.user_id == DEFAULT_USER_ID,
        models.Intervention.outcome == "started",
    ).scalar() or 0

    avg_start_latency = db.query(func.avg(models.Intervention.started_after_seconds)).filter(
        models.Intervention.user_id == DEFAULT_USER_ID,
        models.Intervention.outcome == "started",
        models.Intervention.started_after_seconds.isnot(None),
    ).scalar()

    # Intervention effectiveness by type
    effectiveness = {}
    for itype in ["countdown", "body_double", "shrink", "script", "micro_start"]:
        total = db.query(func.count(models.Intervention.id)).filter(
            models.Intervention.intervention_type == itype,
            models.Intervention.user_id == DEFAULT_USER_ID,
        ).scalar() or 0
        started = db.query(func.count(models.Intervention.id)).filter(
            models.Intervention.intervention_type == itype,
            models.Intervention.outcome == "started",
            models.Intervention.user_id == DEFAULT_USER_ID,
        ).scalar() or 0
        effectiveness[itype] = {
            "total": total,
            "started": started,
            "rate": round(started / max(total, 1) * 100, 1),
        }

    # Avoidance loops (tasks with avoidance_count > 0)
    avoidance_tasks = db.query(func.count(models.Task.id)).filter(
        models.Task.user_id == DEFAULT_USER_ID,
        models.Task.avoidance_count > 0,
        models.Task.status != "done",
    ).scalar() or 0

    return {
        "total_activation_events": total_events,
        "total_interventions": total_interventions,
        "successful_starts": successful_starts,
        "start_success_rate": round(successful_starts / max(total_interventions, 1) * 100, 1),
        "avg_start_latency_seconds": round(avg_start_latency or 0, 1),
        "intervention_effectiveness": effectiveness,
        "active_avoidance_loops": avoidance_tasks,
    }


# ── Private Helpers (Phase 1: heuristic, Phase 2: LLM) ──────

def _classify_cognitive_load(title: str) -> str:
    title_lower = title.lower()
    if any(w in title_lower for w in ["code", "design", "architect", "write", "research", "analyze", "plan", "strategy"]):
        return "deep"
    elif any(w in title_lower for w in ["create", "draw", "brainstorm", "ideate", "compose"]):
        return "creative"
    elif any(w in title_lower for w in ["email", "call", "schedule", "invoice", "file", "submit", "book", "order"]):
        return "admin"
    return "light"


def _estimate_emotional_weight(title: str) -> float:
    title_lower = title.lower()
    high_emotion = ["tax", "doctor", "dentist", "confront", "difficult", "fired", "complaint", "debt", "overdue", "urgent", "deadline"]
    medium_emotion = ["call", "meeting", "present", "review", "discuss", "negotiate"]
    if any(w in title_lower for w in high_emotion):
        return 8.0
    elif any(w in title_lower for w in medium_emotion):
        return 5.0
    return 3.0


def _estimate_ambiguity(title: str, description: str = "") -> float:
    total_len = len(title) + len(description or "")
    if total_len < 15:
        return 8.0  # very vague task
    elif total_len < 40:
        return 5.0
    return 3.0  # well-described
