from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
import json

from app.db import SessionLocal
from app import models
from app.schemas.automation import AutomationCreate, AutomationUpdate, AutomationOut, AutomationRunOut

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

@router.post("", response_model=AutomationOut, status_code=status.HTTP_201_CREATED)
def create_automation(payload: AutomationCreate, db: Session = Depends(get_db)):
    auto = models.Automation(user_id=DEFAULT_USER_ID, **payload.model_dump())
    db.add(auto); db.commit(); db.refresh(auto)
    return auto

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

# Run automations on demand (very simple stub)
@router.post("/{automation_id}/run", response_model=AutomationRunOut)
def run_automation(automation_id: int, db: Session = Depends(get_db)):
    auto = db.get(models.Automation, automation_id)
    if not auto or auto.user_id != DEFAULT_USER_ID:
        raise HTTPException(status_code=404, detail="AUTOMATION_NOT_FOUND")

@router.post("/run-all", response_model=list[AutomationRunOut])
def run_all(db: Session = Depends(get_db)):
    runs = []
    autos = db.query(models.Automation).filter(
        models.Automation.user_id == DEFAULT_USER_ID,
        models.Automation.active == True
    ).all()
    for auto in autos:
        run_resp = run_automation(auto.id, db)  # reuse logic
        runs.append(run_resp)
    return runs

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