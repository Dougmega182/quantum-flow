from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.orm import Session
from app.db import SessionLocal
from app import models
from app.utils.nlp import parse_task_nlp
from datetime import datetime

router = APIRouter(prefix="/v1/ingest", tags=["ingest"])
DEFAULT_USER_ID = 1

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/email")
async def ingest_email(request: Request, db: Session = Depends(get_db)):
    # Simulating a webhook from an email service (e.g., SendGrid/Mailgun)
    data = await request.json()
    
    subject = data.get("subject", "New Task via Email")
    body = data.get("text") or data.get("html") or ""
    sender = data.get("from")
    
    # Use NLP for date extraction from subject
    clean_title, parsed_date = parse_task_nlp(subject)
    
    new_task = models.Task(
        user_id=DEFAULT_USER_ID,
        title=clean_title,
        description=f"From: {sender}\n\n{body}",
        status="open",
        priority="medium",
        due_at=parsed_date,
        created_at=datetime.utcnow()
    )
    
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    
    return {"status": "success", "task_id": new_task.id}
