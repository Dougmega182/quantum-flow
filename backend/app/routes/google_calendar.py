from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
import requests, time
from app.db import SessionLocal
from app import models
from app.config import settings

router = APIRouter(prefix="/v1/integrations/google", tags=["integrations"])

DEFAULT_USER_ID = 1
TOKEN_URL = "https://oauth2.googleapis.com/token"
AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
CAL_EVENTS = "https://www.googleapis.com/calendar/v3/calendars/primary/events"

SCOPES = [
    "https://www.googleapis.com/auth/calendar.events"
]

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_integration(db: Session):
    integ = db.query(models.Integration).filter(
        models.Integration.user_id == DEFAULT_USER_ID,
        models.Integration.provider == "google_calendar"
    ).first()
    if not integ:
        integ = models.Integration(
            user_id=DEFAULT_USER_ID,
            provider="google_calendar",
            status="disconnected",
            config_json={}
        )
        db.add(integ); db.commit(); db.refresh(integ)
    return integ

def save_tokens(db: Session, integ, data: dict):
    cfg = integ.config_json or {}
    cfg.update({
        "access_token": data.get("access_token"),
        "refresh_token": data.get("refresh_token") or cfg.get("refresh_token"),
        "expires_at": time.time() + data.get("expires_in", 0)
    })
    integ.config_json = cfg
    integ.status = "connected"
    db.commit(); db.refresh(integ)

def ensure_token(db: Session, integ):
    cfg = integ.config_json or {}
    if not cfg.get("access_token"):
        raise HTTPException(status_code=400, detail="NOT_AUTHORIZED")
    if time.time() < cfg.get("expires_at", 0) - 60:
        return cfg["access_token"]
    # refresh
    payload = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "grant_type": "refresh_token",
        "refresh_token": cfg.get("refresh_token"),
    }
    resp = requests.post(TOKEN_URL, data=payload, timeout=15)
    if resp.status_code != 200:
        raise HTTPException(status_code=400, detail="TOKEN_REFRESH_FAILED")
    data = resp.json()
    save_tokens(db, integ, data)
    return data["access_token"]

@router.get("/auth-url")
def auth_url():
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "access_type": "offline",
        "prompt": "consent",
        "scope": " ".join(SCOPES),
    }
    from urllib.parse import urlencode
    return {"url": f"{AUTH_URL}?{urlencode(params)}"}

@router.get("/callback")
def callback(code: str = Query(...), db: Session = Depends(get_db)):
    integ = get_integration(db)
    payload = {
        "code": code,
        "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "grant_type": "authorization_code",
    }
    resp = requests.post(TOKEN_URL, data=payload, timeout=15)
    if resp.status_code != 200:
        raise HTTPException(status_code=400, detail=resp.text)
    data = resp.json()
    save_tokens(db, integ, data)
    return {"status": "connected"}

@router.get("/status")
def status(db: Session = Depends(get_db)):
    integ = get_integration(db)
    return {"status": integ.status, "has_token": bool((integ.config_json or {}).get("access_token"))}

@router.post("/pull")
def pull(db: Session = Depends(get_db)):
    integ = get_integration(db)
    token = ensure_token(db, integ)
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.get(CAL_EVENTS, headers=headers, timeout=15, params={"maxResults": 10, "singleEvents": True, "orderBy": "startTime"})
    if resp.status_code != 200:
        raise HTTPException(status_code=400, detail=resp.text)
    data = resp.json().get("items", [])
    # TODO: map to tasks; for now, return fetched items
    return {"fetched": len(data), "items": data}

@router.post("/push")
def push(db: Session = Depends(get_db)):
    # example: push open tasks with due_at and no external_id
    integ = get_integration(db)
    token = ensure_token(db, integ)
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    tasks = db.query(models.Task).filter(
        models.Task.user_id == DEFAULT_USER_ID,
        models.Task.deleted_at.is_(None),
        models.Task.due_at.isnot(None),
        models.Task.status != "done"
    ).limit(10).all()
    created = 0
    for t in tasks:
        body = {
            "summary": t.title,
            "description": t.description,
            "start": {"dateTime": t.due_at},
            "end": {"dateTime": t.due_at},
        }
        resp = requests.post(CAL_EVENTS, headers=headers, json=body, timeout=15)
        if resp.status_code == 200:
            created += 1
        else:
            # soft-fail
            continue
    return {"pushed": created}