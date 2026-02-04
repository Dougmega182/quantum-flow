from datetime import datetime, timedelta
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app import models
from app.db import SessionLocal
from app.schemas.recurrence_rule import RecurrenceRuleCreate, RecurrenceRuleOut

router = APIRouter(prefix="/v1/recurrence", tags=["recurrence"])
DEFAULT_USER_ID = 1
ALLOWED_FREQ = {"daily", "weekly", "monthly"}

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("", response_model=List[RecurrenceRuleOut])
def list_rules(db: Session = Depends(get_db)):
    return (
        db.query(models.RecurrenceRule)
        .filter(models.RecurrenceRule.user_id == DEFAULT_USER_ID)
        .order_by(models.RecurrenceRule.id)
        .all()
    )

@router.post("", response_model=RecurrenceRuleOut, status_code=status.HTTP_201_CREATED)
def create_rule(payload: RecurrenceRuleCreate, db: Session = Depends(get_db)):
    if payload.freq not in ALLOWED_FREQ:
        raise HTTPException(status_code=422, detail="INVALID_FREQ")
    tpl = db.get(models.TaskTemplate, payload.template_id)
    if not tpl or tpl.user_id != DEFAULT_USER_ID:
        raise HTTPException(status_code=404, detail="TEMPLATE_NOT_FOUND")
    rule = models.RecurrenceRule(user_id=DEFAULT_USER_ID, **payload.model_dump())
    db.add(rule); db.commit(); db.refresh(rule)
    return rule

@router.delete("/{rule_id}")
def delete_rule(rule_id: int, db: Session = Depends(get_db)):
    rule = db.get(models.RecurrenceRule, rule_id)
    if not rule or rule.user_id != DEFAULT_USER_ID:
        raise HTTPException(status_code=404, detail="RULE_NOT_FOUND")
    db.delete(rule); db.commit()
    return {"status": "deleted"}

@router.post("/materialize")
def materialize(db: Session = Depends(get_db)):
    now = datetime.utcnow()
    created = 0
    rules = db.query(models.RecurrenceRule).filter(models.RecurrenceRule.user_id == DEFAULT_USER_ID).all()
    for rule in rules:
        tpl = db.get(models.TaskTemplate, rule.template_id)
        if not tpl:
            continue
        due = (now + timedelta(days=tpl.default_due_days)) if tpl.default_due_days is not None else None
        task = models.Task(
            user_id=DEFAULT_USER_ID,
            intent_id=tpl.intent_id,
            title=tpl.title,
            description=tpl.description,
            priority=tpl.priority,
            due_at=due,
            status="open",
        )
        db.add(task)
        rule.last_materialized_at = now
        created += 1
    db.commit()
    return {"created": created}