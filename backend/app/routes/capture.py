from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.intent import Intent
from app.schemas.intent import IntentCreate

router = APIRouter(prefix="/capture", tags=["capture"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/")
def capture_intent(
    data: IntentCreate,
    db: Session = Depends(get_db)
):
    intent = Intent(
        type=data.type,
        title=data.title,
        content=data.content
    )
    db.add(intent)
    db.commit()
    db.refresh(intent)

    return {
        "status": "captured",
        "id": str(intent.id)
    }
