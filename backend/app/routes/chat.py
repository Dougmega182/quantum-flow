"""Conversational Planning Assistant — Phase 2A.

POST /v1/ai/chat  →  Parse natural-language intent, execute action, return structured reply.
"""
import re
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app import models
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


def _detect_intent(msg: str) -> tuple[str, Optional[str]]:
    """Return (intent, extracted_detail)."""
    lower = msg.lower().strip()

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

def _handle_create(detail: str, db: Session) -> ChatResponse:
    title, due_at = parse_task_nlp(detail)
    task = models.Task(
        user_id=DEFAULT_USER_ID,
        title=title,
        due_at=due_at,
        status="open",
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return ChatResponse(
        reply=f"✅ Created task **\"{task.title}\"**"
              + (f" due {task.due_at.strftime('%b %d')}" if task.due_at else "")
              + ".",
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
    else:
        # General / unrecognized — provide help
        return ChatResponse(
            reply="👋 I can help you with:\n"
                  "• **Create tasks** — _\"Add a task to review PR\"_\n"
                  "• **Complete tasks** — _\"Mark done review PR\"_\n"
                  "• **Check status** — _\"Show my tasks\"_\n"
                  "• **Schedule** — _\"Plan my day\"_ or _\"Block time for deep work\"_\n"
                  "• **Reschedule** — _\"Reschedule my overdue tasks\"_",
        )
