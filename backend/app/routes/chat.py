"""Conversational Planning Assistant — Phase 2A + 4C enhancements.

POST /v1/ai/chat  →  Parse natural-language intent, execute action, return structured reply.
"""
import re
import json
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app import models
from app.models.team_member import TeamMember
from app.models.workflow_blueprint import WorkflowBlueprint
from app.schemas.chat import ChatRequest, ChatResponse, ChatAction
from app.utils.nlp import parse_task_nlp

router = APIRouter(prefix="/v1/ai", tags=["ai"])
DEFAULT_USER_ID = 1


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── Intent Detection ──────────────────────────────────────────────

_CREATE_PATTERNS = [
    r"(?:create|add|new|make)\s+(?:a\s+)?(?:task|todo|to-do|reminder)\s*(?:called|named|for|to|:)?\s*(.+)",
    r"(?:remind me to|i need to|todo:?)\s+(.+)",
]

_SCHEDULE_PATTERNS = [
    r"(?:schedule|block|plan|book)\s+(?:time for|a?\s*block for|out)?\s*(.+)",
    r"(?:auto[\s-]?plan|plan my day)",
]

_QUERY_PATTERNS = [
    r"(?:show|list|what(?:'s| is| are)?|how many)\s+(?:my\s+)?(?:tasks?|todos?|overdue|upcoming|open)",
    r"(?:what(?:'s| is) (?:on|for|due))\s+(?:today|tomorrow|this week)",
]

_RESCHEDULE_PATTERNS = [
    r"(?:reschedule|move|push|delay)\s+(?:my\s+)?(?:overdue|late|tasks?)",
]

_COMPLETE_PATTERNS = [
    r"(?:complete|finish|done|mark done|check off)\s+(.+)",
]

# Phase 4C: New intents
_ASSIGN_PATTERNS = [
    r"(?:assign|give|hand)\s+(?:task\s+)?[\"']?(.+?)[\"']?\s+to\s+(.+)",
    r"(?:assign)\s+(.+?)\s+to\s+(.+)",
]

_BLUEPRINT_PATTERNS = [
    r"(?:use|run|start|apply|instantiate)\s+(?:the\s+)?(?:blueprint|template|workflow)\s*(?:for|:)?\s*(.+)",
    r"(?:use|run|start|apply)\s+(.+?)\s+(?:blueprint|template|workflow)",
]

_PRIORITY_PATTERNS = [
    r"(?:set|change|make|mark)\s+(?:task\s+)?[\"']?(.+?)[\"']?\s+(?:to|as)\s+(high|medium|low)\s*(?:priority)?",
    r"(?:set|change)\s+priority\s+(?:of|for)\s+[\"']?(.+?)[\"']?\s+to\s+(high|medium|low)",
]


def _detect_intent(msg: str) -> tuple[str, Optional[str]]:
    """Return (intent, extracted_detail)."""
    lower = msg.lower().strip()

    # Phase 4C: Assign (check before create to avoid conflicts)
    for pat in _ASSIGN_PATTERNS:
        m = re.search(pat, lower)
        if m:
            return "assign_task", f"{m.group(1).strip()}|||{m.group(2).strip()}"

    # Phase 4C: Blueprint
    for pat in _BLUEPRINT_PATTERNS:
        m = re.search(pat, lower)
        if m:
            return "use_blueprint", m.group(1).strip()

    # Phase 4C: Priority
    for pat in _PRIORITY_PATTERNS:
        m = re.search(pat, lower)
        if m:
            return "set_priority", f"{m.group(1).strip()}|||{m.group(2).strip()}"

    for pat in _CREATE_PATTERNS:
        m = re.search(pat, lower)
        if m:
            return "create_task", m.group(1).strip()

    for pat in _COMPLETE_PATTERNS:
        m = re.search(pat, lower)
        if m:
            return "complete_task", m.group(1).strip()

    for pat in _SCHEDULE_PATTERNS:
        m = re.search(pat, lower)
        detail = m.group(1).strip() if m and m.lastindex else None
        if m:
            return "schedule", detail

    for pat in _RESCHEDULE_PATTERNS:
        if re.search(pat, lower):
            return "reschedule", None

    for pat in _QUERY_PATTERNS:
        if re.search(pat, lower):
            return "query_tasks", None

    return "general", None


# ── Action Handlers ───────────────────────────────────────────────

def _extract_attrs(detail: str) -> dict:
    """Phase 4C: Extract priority, energy, duration from natural language."""
    attrs: dict = {}
    lower = detail.lower()

    # Priority
    prio_match = re.search(r"\b(high|medium|low)\s+priority\b", lower)
    if prio_match:
        attrs["priority"] = prio_match.group(1)
        detail = re.sub(r"\b(high|medium|low)\s+priority\b", "", detail, flags=re.IGNORECASE).strip()

    # Energy
    energy_match = re.search(r"\b(high|medium|low)\s+energy\b", lower)
    if energy_match:
        attrs["energy_level"] = energy_match.group(1)
        detail = re.sub(r"\b(high|medium|low)\s+energy\b", "", detail, flags=re.IGNORECASE).strip()

    # Duration
    dur_match = re.search(r"(\d+)\s*(?:min|minutes|mins)", lower)
    if dur_match:
        attrs["duration_minutes"] = int(dur_match.group(1))
        detail = re.sub(r"\d+\s*(?:min|minutes|mins)", "", detail, flags=re.IGNORECASE).strip()

    attrs["_cleaned"] = detail
    return attrs


def _handle_create(detail: str, db: Session) -> ChatResponse:
    attrs = _extract_attrs(detail)
    title, due_at = parse_task_nlp(attrs["_cleaned"])
    task = models.Task(
        user_id=DEFAULT_USER_ID,
        title=title,
        due_at=due_at,
        status="open",
        priority=attrs.get("priority"),
        energy_level=attrs.get("energy_level"),
        duration_minutes=attrs.get("duration_minutes"),
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    extras = []
    if task.priority:
        extras.append(f"{task.priority} priority")
    if task.energy_level:
        extras.append(f"{task.energy_level} energy")
    if task.duration_minutes:
        extras.append(f"{task.duration_minutes}min")
    extra_str = f" ({', '.join(extras)})" if extras else ""

    return ChatResponse(
        reply=f"✅ Created task **\"{task.title}\"**"
              + (f" due {task.due_at.strftime('%b %d')}" if task.due_at else "")
              + extra_str + ".",
        actions=[ChatAction(type="created_task", task_id=task.id, detail=task.title)],
        task_card={
            "id": task.id,
            "title": task.title,
            "due_at": task.due_at.isoformat() if task.due_at else None,
            "status": task.status,
        },
    )


def _handle_complete(detail: str, db: Session) -> ChatResponse:
    # Fuzzy match task by title
    tasks = (
        db.query(models.Task)
        .filter(
            models.Task.user_id == DEFAULT_USER_ID,
            models.Task.deleted_at.is_(None),
            models.Task.status != "done",
            models.Task.title.ilike(f"%{detail}%"),
        )
        .limit(1)
        .all()
    )
    if not tasks:
        return ChatResponse(reply=f"❌ Couldn't find an open task matching \"{detail}\".")

    t = tasks[0]
    # Check dependency
    if t.depends_on_id:
        dep = db.get(models.Task, t.depends_on_id)
        if dep and dep.status != "done" and dep.deleted_at is None:
            return ChatResponse(
                reply=f"⚠️ Can't complete **\"{t.title}\"** — it depends on **\"{dep.title}\"** which isn't done yet.",
                actions=[ChatAction(type="info", task_id=t.id)],
            )

    t.status = "done"
    t.completed_at = datetime.utcnow()
    db.commit()
    return ChatResponse(
        reply=f"✅ Marked **\"{t.title}\"** as done!",
        actions=[ChatAction(type="completed_task", task_id=t.id, detail=t.title)],
    )


def _handle_query(db: Session) -> ChatResponse:
    now = datetime.utcnow()
    base = db.query(models.Task).filter(
        models.Task.user_id == DEFAULT_USER_ID,
        models.Task.deleted_at.is_(None),
        models.Task.status != "done",
    )
    total_open = base.count()
    overdue = base.filter(models.Task.due_at < now).count()
    today_start = datetime(now.year, now.month, now.day)
    today_end = today_start + timedelta(days=1)
    due_today = base.filter(models.Task.due_at >= today_start, models.Task.due_at < today_end).count()

    lines = [
        f"📊 You have **{total_open}** open tasks.",
        f"• **{due_today}** due today",
        f"• **{overdue}** overdue",
    ]
    if overdue > 0:
        lines.append("\n💡 Try saying *\"reschedule my overdue tasks\"* to auto-fix them.")

    return ChatResponse(
        reply="\n".join(lines),
        actions=[ChatAction(type="info", detail=f"{total_open} open, {overdue} overdue")],
    )


def _handle_schedule(detail: Optional[str], db: Session) -> ChatResponse:
    # If detail is provided, create a time block task
    if detail:
        title, due_at = parse_task_nlp(detail)
        if not due_at:
            due_at = datetime.utcnow().replace(hour=9, minute=0, second=0, microsecond=0) + timedelta(days=1)
        task = models.Task(
            user_id=DEFAULT_USER_ID,
            title=f"🔒 {title}",
            due_at=due_at,
            duration_minutes=30,
            energy_level="high",
            status="open",
        )
        db.add(task)
        db.commit()
        db.refresh(task)
        return ChatResponse(
            reply=f"📅 Blocked **30 min** for **\"{title}\"** on {due_at.strftime('%b %d at %I:%M %p')}.",
            actions=[ChatAction(type="scheduled", task_id=task.id, detail=title)],
            task_card={
                "id": task.id,
                "title": task.title,
                "due_at": due_at.isoformat(),
                "duration_minutes": 30,
            },
        )

    # No detail → trigger auto-plan
    from app.routes.auto_plan import _auto_plan_logic
    items, msg, focus_mins = _auto_plan_logic(db)
    schedule_preview = [
        {"task_id": it.task_id, "title": it.title, "start_time": it.start_time, "end_time": it.end_time}
        for it in items
    ]
    return ChatResponse(
        reply=f"⚡ {msg}\n\nTotal focus time: **{focus_mins} min**.",
        actions=[ChatAction(type="scheduled", detail=f"{len(items)} tasks planned")],
        schedule_preview=schedule_preview,
    )


def _handle_reschedule(db: Session) -> ChatResponse:
    now = datetime.utcnow()
    overdue = (
        db.query(models.Task)
        .filter(
            models.Task.user_id == DEFAULT_USER_ID,
            models.Task.deleted_at.is_(None),
            models.Task.status != "done",
            models.Task.due_at < now,
        )
        .all()
    )
    if not overdue:
        return ChatResponse(reply="🎉 No overdue tasks — you're all caught up!")

    next_day = datetime(now.year, now.month, now.day, 9, 0) + timedelta(days=1)
    moved = []
    for t in overdue:
        t.due_at = next_day
        next_day += timedelta(hours=1)
        moved.append(t.title)
    db.commit()

    bullet_list = "\n".join(f"• {t}" for t in moved[:5])
    extra = f"\n• ...and {len(moved) - 5} more" if len(moved) > 5 else ""
    return ChatResponse(
        reply=f"🔄 Rescheduled **{len(moved)}** overdue tasks to tomorrow:\n{bullet_list}{extra}",
        actions=[ChatAction(type="rescheduled", detail=f"{len(moved)} tasks moved")],
    )


# ── Phase 4C: New Handlers ────────────────────────────────────────

def _handle_assign(detail: str, db: Session) -> ChatResponse:
    parts = detail.split("|||")
    if len(parts) != 2:
        return ChatResponse(reply="❌ I couldn't parse the assignment. Try: _\"assign review PR to Alice\"_")

    task_name, member_name = parts
    # Find task
    task = (
        db.query(models.Task)
        .filter(
            models.Task.user_id == DEFAULT_USER_ID,
            models.Task.deleted_at.is_(None),
            models.Task.status != "done",
            models.Task.title.ilike(f"%{task_name}%"),
        )
        .first()
    )
    if not task:
        return ChatResponse(reply=f"❌ Couldn't find an open task matching \"{task_name}\".")

    # Find member
    member = db.query(TeamMember).filter(TeamMember.name.ilike(f"%{member_name}%")).first()
    if not member:
        return ChatResponse(reply=f"❌ Couldn't find a team member matching \"{member_name}\".")

    task.assigned_to = member.id
    db.commit()
    return ChatResponse(
        reply=f"✅ Assigned **\"{task.title}\"** to **{member.name}**.",
        actions=[ChatAction(type="assigned", task_id=task.id, detail=f"{member.name}")],
    )


def _handle_blueprint(detail: str, db: Session) -> ChatResponse:
    bp = (
        db.query(WorkflowBlueprint)
        .filter(WorkflowBlueprint.title.ilike(f"%{detail}%"))
        .first()
    )
    if not bp:
        return ChatResponse(reply=f"❌ Couldn't find a blueprint matching \"{detail}\".")

    steps = json.loads(bp.steps_json)
    order_to_task_id: dict[int, int] = {}
    created = []

    for step in sorted(steps, key=lambda s: s.get("order", 0)):
        depends_on_step = step.get("depends_on_step")
        parent_task_id = order_to_task_id.get(depends_on_step) if depends_on_step else None
        t = models.Task(
            user_id=DEFAULT_USER_ID,
            title=step.get("title", "Untitled"),
            duration_minutes=step.get("duration_minutes", 30),
            energy_level=step.get("energy_level", "medium"),
            depends_on_id=parent_task_id,
            status="open",
        )
        db.add(t)
        db.flush()
        order_to_task_id[step["order"]] = t.id
        created.append(t.title)
    db.commit()

    bullet_list = "\n".join(f"• {c}" for c in created[:5])
    return ChatResponse(
        reply=f"📋 Instantiated **\"{bp.title}\"** — created {len(created)} tasks:\n{bullet_list}",
        actions=[ChatAction(type="blueprint_used", detail=bp.title)],
    )


def _handle_priority(detail: str, db: Session) -> ChatResponse:
    parts = detail.split("|||")
    if len(parts) != 2:
        return ChatResponse(reply="❌ Try: _\"set review PR to high priority\"_")

    task_name, priority = parts
    task = (
        db.query(models.Task)
        .filter(
            models.Task.user_id == DEFAULT_USER_ID,
            models.Task.deleted_at.is_(None),
            models.Task.status != "done",
            models.Task.title.ilike(f"%{task_name}%"),
        )
        .first()
    )
    if not task:
        return ChatResponse(reply=f"❌ Couldn't find an open task matching \"{task_name}\".")

    task.priority = priority
    db.commit()
    return ChatResponse(
        reply=f"✅ Set **\"{task.title}\"** to **{priority}** priority.",
        actions=[ChatAction(type="priority_set", task_id=task.id, detail=priority)],
    )


# ── Main Endpoint ─────────────────────────────────────────────────

@router.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest, db: Session = Depends(get_db)):
    intent, detail = _detect_intent(req.message)

    if intent == "create_task" and detail:
        return _handle_create(detail, db)
    elif intent == "complete_task" and detail:
        return _handle_complete(detail, db)
    elif intent == "query_tasks":
        return _handle_query(db)
    elif intent == "schedule":
        return _handle_schedule(detail, db)
    elif intent == "reschedule":
        return _handle_reschedule(db)
    elif intent == "assign_task" and detail:
        return _handle_assign(detail, db)
    elif intent == "use_blueprint" and detail:
        return _handle_blueprint(detail, db)
    elif intent == "set_priority" and detail:
        return _handle_priority(detail, db)
    else:
        return ChatResponse(
            reply="👋 I can help you with:\n"
                  "• **Create tasks** — _\"Add a task to review PR\"_\n"
                  "• **Complete tasks** — _\"Mark done review PR\"_\n"
                  "• **Check status** — _\"Show my tasks\"_\n"
                  "• **Schedule** — _\"Plan my day\"_\n"
                  "• **Assign** — _\"Assign review PR to Alice\"_\n"
                  "• **Blueprints** — _\"Use sprint planning blueprint\"_\n"
                  "• **Priority** — _\"Set review PR to high priority\"_\n"
                  "• **Reschedule** — _\"Reschedule my overdue tasks\"_",
        )
