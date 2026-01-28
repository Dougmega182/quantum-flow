from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from app.db import SessionLocal
from app import models
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

@router.get("", response_model=list[RecurrenceRuleOut])
def list_rules(db: Session = Depends(get_db)):
    q = db.query(models.RecurrenceRule).filter(models.RecurrenceRule.user_id == DEFAULT_USER_ID)
    return q.order_by(models.RecurrenceRule.id).all()

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

# Simple materialization: create next occurrence for each rule
@router.post("/materialize")
def materialize(db: Session = Depends(get_db)):
    now = datetime.utcnow()
    created = []
    rules = db.query(models.RecurrenceRule).filter(models.RecurrenceRule.user_id == DEFAULT_USER_ID).all()
    for rule in rules:
        tpl = db.get(models.TaskTemplate, rule.template_id)
        if not tpl:
            continue
        # naive next occurrence: always create one new task now with due_at offset if provided
        due = None
        if tpl.default_due_days is not None:
            due = now + timedelta(days=tpl.default_due_days)
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
        created.append(task)
    db.commit()
    return {"created": len(created)}