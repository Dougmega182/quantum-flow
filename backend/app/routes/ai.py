from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime
from app.db import SessionLocal
from app import models
from app.schemas.ai import AISuggestion, AISummaryRequest, AISummaryResponse

router = APIRouter(prefix="/v1/ai", tags=["ai"])
DEFAULT_USER_ID = 1

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/suggest", response_model=list[AISuggestion])
def suggest(db: Session = Depends(get_db)):
    now = datetime.utcnow()
    suggestions = []
    overdue = db.query(models.Task).filter(
        models.Task.user_id == DEFAULT_USER_ID,
        models.Task.deleted_at.is_(None),
        models.Task.status != "done",
        models.Task.due_at.isnot(None),
        models.Task.due_at < now,
    ).limit(5).all()
    for t in overdue:
        suggestions.append(AISuggestion(
            title=f"Complete overdue: {t.title}",
            description=t.description,
            action_type="complete_task",
            payload={"task_id": t.id},
            confidence=0.8,
        ))
    tpl = db.query(models.TaskTemplate).filter_by(title="Daily review", user_id=DEFAULT_USER_ID).first()
    if tpl:
        suggestions.append(AISuggestion(
            title="Create Daily review for today",
            description="Use template Daily review",
            action_type="create_task_from_template",
            payload={"template_id": tpl.id, "due_at": now.isoformat()},
            confidence=0.7,
        ))
    return suggestions

@router.post("/summarize", response_model=AISummaryResponse)
def summarize(req: AISummaryRequest):
    text = req.text.strip()
    summary = text[:197] + "..." if len(text) > 200 else text
    return AISummaryResponse(summary=summary)