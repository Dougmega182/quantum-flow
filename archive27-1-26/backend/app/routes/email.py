from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.intent import Intent, IntentType
from app.schemas.email import EmailIngest

router = APIRouter(prefix="/ingest/email")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/")
def ingest_email(data: EmailIngest, db: Session = Depends(get_db)):
    intent = Intent(
        type=IntentType.message,
        title=data.subject,
        content=f"From: {data.from_email}\n\n{data.body_preview}"
    )
    db.add(intent)
    db.commit()

    return {
        "status": "ingested",
        "intent_id": str(intent.id)
    }
