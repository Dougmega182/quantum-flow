from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app import models
from app.schemas.intent import IntentCreate, IntentUpdate, IntentOut
from pydantic import BaseModel

class IntentList(BaseModel):
    items: List[IntentOut]
    limit: int
    offset: int
    total: int

router = APIRouter(prefix="/v1/intents", tags=["intents"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("", response_model=IntentList)
def list_intents(q: Optional[str] = None, limit: int = 50, offset: int = 0, db: Session = Depends(get_db)):
    limit = min(limit, 200)
    query = db.query(models.Intent)
    if q:
        query = query.filter(models.Intent.name.ilike(f"%{q}%"))
    total = query.count()
    items = query.order_by(models.Intent.id).offset(offset).limit(limit).all()
    return {"items": items, "limit": limit, "offset": offset, "total": total}

@router.get("/{intent_id}", response_model=IntentOut)
def get_intent(intent_id: int, db: Session = Depends(get_db)):
    intent = db.query(models.Intent).get(intent_id)
    if not intent:
        raise HTTPException(status_code=404, detail="INTENT_NOT_FOUND")
    return intent

@router.post("", response_model=IntentOut, status_code=status.HTTP_201_CREATED)
def create_intent(payload: IntentCreate, db: Session = Depends(get_db)):
    existing = db.query(models.Intent).filter(models.Intent.name == payload.name).first()
    if existing:
        raise HTTPException(status_code=409, detail="INTENT_ALREADY_EXISTS")
    intent = models.Intent(name=payload.name, description=payload.description)
    db.add(intent)
    db.commit()
    db.refresh(intent)
    return intent

@router.patch("/{intent_id}", response_model=IntentOut)
def update_intent(intent_id: int, payload: IntentUpdate, db: Session = Depends(get_db)):
    intent = db.query(models.Intent).get(intent_id)
    if not intent:
        raise HTTPException(status_code=404, detail="INTENT_NOT_FOUND")
    if payload.description is not None:
        intent.description = payload.description
    db.commit()
    db.refresh(intent)
    return intent

@router.delete("/{intent_id}")
def delete_intent(intent_id: int):
    raise HTTPException(status_code=405, detail="INTENT_DELETE_DISABLED")