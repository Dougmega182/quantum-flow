from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db import SessionLocal
from app import models
from app.schemas.task import TaskOut  # <-- fix import

router = APIRouter(prefix="/v1/task-templates", tags=["task_templates"])
DEFAULT_USER_ID = 1

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/{template_id}/create-task", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
def create_task_from_template(template_id: int, db: Session = Depends(get_db)):
    tpl = db.get(models.TaskTemplate, template_id)
    if not tpl or tpl.user_id != DEFAULT_USER_ID:
        raise HTTPException(status_code=404, detail="TEMPLATE_NOT_FOUND")

    task = models.Task(
        user_id=DEFAULT_USER_ID,
        title=tpl.title,
        description=tpl.description,
        intent_id=tpl.intent_id,
        priority=tpl.priority,
        status="open",
        # due_at logic optional if you use default_due_days
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task