from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db import SessionLocal
from app import models
from app.schemas.automation import AutomationRunOut
from app.schemas.automation import AutomationCreate, AutomationUpdate, AutomationOut

router = APIRouter(prefix="/v1/automations", tags=["automations"])
DEFAULT_USER_ID = 1

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("", response_model=List[AutomationOut])
def list_automations(db: Session = Depends(get_db)):
    return db.query(models.Automation).filter(models.Automation.user_id == DEFAULT_USER_ID).all()

@router.get("/{automation_id}", response_model=AutomationOut)
def get_automation(automation_id: int, db: Session = Depends(get_db)):
    auto = db.get(models.Automation, automation_id)
    if not auto or auto.user_id != DEFAULT_USER_ID:
        raise HTTPException(status_code=404, detail="AUTOMATION_NOT_FOUND")
    return auto

@router.patch("/{automation_id}", response_model=AutomationOut)
def update_automation(automation_id: int, payload: AutomationUpdate, db: Session = Depends(get_db)):
    auto = db.get(models.Automation, automation_id)
    if not auto or auto.user_id != DEFAULT_USER_ID:
        raise HTTPException(status_code=404, detail="AUTOMATION_NOT_FOUND")
    updates = payload.model_dump(exclude_unset=True)
    for k, v in updates.items():
        setattr(auto, k, v)
    db.commit(); db.refresh(auto)
    return auto

@router.delete("/{automation_id}")
def delete_automation(automation_id: int, db: Session = Depends(get_db)):
    auto = db.get(models.Automation, automation_id)
    if not auto or auto.user_id != DEFAULT_USER_ID:
        raise HTTPException(status_code=404, detail="AUTOMATION_NOT_FOUND")
    db.delete(auto); db.commit()
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
@router.post("/run-all", response_model=list[AutomationRunOut])
def run_all(db: Session = Depends(get_db)):
    runs = []
    autos = db.query(models.Automation).filter(
        models.Automation.user_id == DEFAULT_USER_ID,
        models.Automation.active == True
    ).all()
    for auto in autos:
        runs.append(run_automation(auto.id, db))
    return runs

# Run automations on demand (very simple stub)
@router.post("/{automation_id}/run", response_model=AutomationRunOut)
def run_automation(automation_id: int, db: Session = Depends(get_db)):
    auto = db.get(models.Automation, automation_id)
    if not auto or auto.user_id != DEFAULT_USER_ID:
        raise HTTPException(status_code=404, detail="AUTOMATION_NOT_FOUND")
    
    status_val = "success"
    message = "Executed stub action."

    # Minimal action example: if action_type == create_task
    try:
        if auto.action_type == "create_task":
            cfg = json.loads(auto.action_config or "{}")
            title = cfg.get("title", f"Auto task {datetime.utcnow().isoformat()}")
            description = cfg.get("description", "")
            task = models.Task(
                user_id=DEFAULT_USER_ID,
                title=title,
                description=description,
                status="open",
            )
            db.add(task)
        # add more action types as needed
        db.commit()
    except Exception as e:
        db.rollback()
        status_val = "error"
        message = str(e)

    run = models.AutomationRun(
        automation_id=automation_id,
        status=status_val,
        message=message,
    )
    db.add(run); db.commit(); db.refresh(run)
    return run

