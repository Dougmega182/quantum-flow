from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db import SessionLocal
from app import models
from app.schemas.integration import IntegrationCreate, IntegrationUpdate, IntegrationOut, IntegrationEventOut

router = APIRouter(prefix="/v1/integrations", tags=["integrations"])
DEFAULT_USER_ID = 1

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("", response_model=List[IntegrationOut])
def list_integrations(db: Session = Depends(get_db)):
    return db.query(models.Integration).filter(models.Integration.user_id == DEFAULT_USER_ID).all()

@router.post("", response_model=IntegrationOut, status_code=status.HTTP_201_CREATED)
def create_integration(payload: IntegrationCreate, db: Session = Depends(get_db)):
    integ = models.Integration(user_id=DEFAULT_USER_ID, **payload.model_dump())
    db.add(integ); db.commit(); db.refresh(integ)
    return integ

@router.get("/{integration_id}", response_model=IntegrationOut)
def get_integration(integration_id: int, db: Session = Depends(get_db)):
    integ = db.get(models.Integration, integration_id)
    if not integ or integ.user_id != DEFAULT_USER_ID:
        raise HTTPException(status_code=404, detail="INTEGRATION_NOT_FOUND")
    return integ

@router.patch("/{integration_id}", response_model=IntegrationOut)
def update_integration(integration_id: int, payload: IntegrationUpdate, db: Session = Depends(get_db)):
    integ = db.get(models.Integration, integration_id)
    if not integ or integ.user_id != DEFAULT_USER_ID:
        raise HTTPException(status_code=404, detail="INTEGRATION_NOT_FOUND")
    updates = payload.model_dump(exclude_unset=True)
    for k, v in updates.items():
        setattr(integ, k, v)
    db.commit(); db.refresh(integ)
    return integ

@router.delete("/{integration_id}")
def delete_integration(integration_id: int, db: Session = Depends(get_db)):
    integ = db.get(models.Integration, integration_id)
    if not integ or integ.user_id != DEFAULT_USER_ID:
        raise HTTPException(status_code=404, detail="INTEGRATION_NOT_FOUND")
    db.delete(integ); db.commit()
    return {"status": "deleted"}

@router.get("/{integration_id}/events", response_model=List[IntegrationEventOut])
def list_events(integration_id: int, db: Session = Depends(get_db)):
    integ = db.get(models.Integration, integration_id)
    if not integ or integ.user_id != DEFAULT_USER_ID:
        raise HTTPException(status_code=404, detail="INTEGRATION_NOT_FOUND")
    return db.query(models.IntegrationEvent).filter(models.IntegrationEvent.integration_id == integration_id).order_by(models.IntegrationEvent.id.desc()).all()

# Provider-specific status placeholders
@router.get("/calendar/status")
def calendar_status():
    return {"provider": "google_calendar", "status": "disconnected"}

@router.post("/calendar/pull")
def calendar_pull():
    return {"provider": "google_calendar", "pulled": True}

@router.post("/calendar/push")
def calendar_push():
    return {"provider": "google_calendar", "pushed": True}

@router.get("/email/status")
def email_status():
    return {"provider": "email", "status": "disconnected"}

@router.post("/email/ingest")
def email_ingest():
    return {"provider": "email", "ingested": True}