from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db import SessionLocal
from app import models
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/v1/users", tags=["users"])
DEFAULT_USER_ID = 1

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class UserUpdate(BaseModel):
    avatar_url: Optional[str] = None

class UserOut(BaseModel):
    id: int
    email: str
    avatar_url: Optional[str] = None
    
    class Config:
        from_attributes = True

@router.get("/me", response_model=UserOut)
def get_me(db: Session = Depends(get_db)):
    user = db.get(models.User, DEFAULT_USER_ID)
    if not user:
        raise HTTPException(status_code=404, detail="USER_NOT_FOUND")
    return user

@router.patch("/me", response_model=UserOut)
def update_me(payload: UserUpdate, db: Session = Depends(get_db)):
    user = db.get(models.User, DEFAULT_USER_ID)
    if not user:
        raise HTTPException(status_code=404, detail="USER_NOT_FOUND")
    
    if payload.avatar_url is not None:
        user.avatar_url = payload.avatar_url
    
    db.commit()
    db.refresh(user)
    return user
