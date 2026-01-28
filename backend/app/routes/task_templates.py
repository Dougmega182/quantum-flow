from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import Optional
from app.db import SessionLocal
from app import models
from app.schemas.task_template import TaskTemplateCreate, TaskTemplateOut

router = APIRouter(prefix="/v1/task-templates", tags=["task-templates"])

DEFAULT_USER_ID = 1

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("", response_model=list[TaskTemplateOut])
def list_templates(limit: int = 100, offset: int = 0, db: Session = Depends(get_db)):
    q = db.query(models.TaskTemplate).filter(models.TaskTemplate.user_id == DEFAULT_USER_ID)
    return q.order_by(models.TaskTemplate.id).offset(offset).limit(limit).all()

@router.post("", response_model=TaskTemplateOut, status_code=status.HTTP_201_CREATED)
def create_template(payload: TaskTemplateCreate, db: Session = Depends(get_db)):
    tpl = models.TaskTemplate(user_id=DEFAULT_USER_ID, **payload.model_dump())
    db.add(tpl); db.commit(); db.refresh(tpl)
    return tpl

@router.delete("/{template_id}")
def delete_template(template_id: int, db: Session = Depends(get_db)):
    tpl = db.get(models.TaskTemplate, template_id)
    if not tpl or tpl.user_id != DEFAULT_USER_ID:
        raise HTTPException(status_code=404, detail="TEMPLATE_NOT_FOUND")
    db.delete(tpl); db.commit()
    return {"status": "deleted"}