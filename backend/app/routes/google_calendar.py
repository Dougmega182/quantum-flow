from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
import requests, time
from app.db import SessionLocal
from app import models
from app.config import settings
from app.auth import require_api_key

router = APIRouter(prefix="/v1/google-calendar", tags=["google-calendar"])

DEFAULT_USER_ID = 1
TOKEN_URL = "https://oauth2.googleapis.com/token"
AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
CAL_EVENTS = "https://www.googleapis.com/calendar/v3/calendars/primary/events"

SCOPES = [
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/gmail.readonly"
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

@router.get("/auth-url", dependencies=[Depends(require_api_key)])
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
    # Redirect back to the frontend to avoid showing JSON to the user
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url="http://localhost:5173/integrations")

@router.get("/status", dependencies=[Depends(require_api_key)])
def status(db: Session = Depends(get_db)):
    integ = get_integration(db)
    return {"status": integ.status, "has_token": bool((integ.config_json or {}).get("access_token"))}

@router.post("/pull", dependencies=[Depends(require_api_key)])
def pull(db: Session = Depends(get_db)):
    integ = get_integration(db)
    token = ensure_token(db, integ)
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.get(CAL_EVENTS, headers=headers, timeout=15, params={"maxResults": 10, "singleEvents": True, "orderBy": "startTime"})
    if resp.status_code != 200:
        raise HTTPException(status_code=400, detail=resp.text)
    items = resp.json().get("items", [])
    
    synced = 0
    from datetime import datetime
    for item in items:
        ext_id = item.get("id")
        # Check if already synced
        exists = db.query(models.ExternalEvent).filter(
            models.ExternalEvent.provider == "google_calendar",
            models.ExternalEvent.external_id == ext_id
        ).first()
        if exists:
            continue
            
        # Map to new task
        start = item.get("start", {})
        due_at_str = start.get("dateTime") or start.get("date")
        due_at = None
        if due_at_str:
            try:
                # Simple ISO parsing (Google uses ISO 8601)
                due_at = datetime.fromisoformat(due_at_str.replace("Z", "+00:00"))
            except:
                pass
                
        new_task = models.Task(
            user_id=DEFAULT_USER_ID,
            title=item.get("summary", "Untitled Event"),
            description=item.get("description"),
            due_at=due_at,
            status="open"
        )
        db.add(new_task)
        db.flush() # Get task ID
        
        ext_event = models.ExternalEvent(
            task_id=new_task.id,
            provider="google_calendar",
            external_id=ext_id,
            last_synced_at=datetime.utcnow()
        )
        db.add(ext_event)
        synced += 1
    
    db.commit()
    return {"fetched": len(items), "synced": synced}

@router.post("/pull-gmail", dependencies=[Depends(require_api_key)])
def pull_gmail(db: Session = Depends(get_db)):
    integ = get_integration(db)
    token = ensure_token(db, integ)
    headers = {"Authorization": f"Bearer {token}"}
    
    # List starred messages
    starred_url = "https://gmail.googleapis.com/gmail/v1/users/me/messages"
    resp = requests.get(starred_url, headers=headers, params={"q": "is:starred", "maxResults": 10}, timeout=15)
    if resp.status_code != 200:
        raise HTTPException(status_code=400, detail=resp.text)
        
    messages = resp.json().get("messages", [])
    synced = 0
    
    for msg in messages:
        msg_id = msg["id"]
        # Check if already synced
        exists = db.query(models.ExternalEvent).filter(
            models.ExternalEvent.provider == "gmail",
            models.ExternalEvent.external_id == msg_id
        ).first()
        if exists:
            continue
            
        # Get message details (subject)
        detail_url = f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{msg_id}"
        m_resp = requests.get(detail_url, headers=headers, timeout=15)
        if m_resp.status_code != 200:
            continue
            
        m_data = m_resp.json()
        headers_list = m_data.get("payload", {}).get("headers", [])
        subject = next((h["value"] for h in headers_list if h["name"] == "Subject"), "Untitled Email")
        snippet = m_data.get("snippet", "")
        
        new_task = models.Task(
            user_id=DEFAULT_USER_ID,
            title=f"Email: {subject}",
            description=snippet,
            labels="email,starred",
            status="open"
        )
        db.add(new_task)
        db.flush()
        
        ext_event = models.ExternalEvent(
            task_id=new_task.id,
            provider="gmail",
            external_id=msg_id,
            last_synced_at=datetime.utcnow()
        )
        db.add(ext_event)
        synced += 1
        
    db.commit()
    return {"fetched": len(messages), "synced": synced}

@router.post("/push", dependencies=[Depends(require_api_key)])
def push(db: Session = Depends(get_db)):
    integ = get_integration(db)
    token = ensure_token(db, integ)
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    # Get tasks that are NOT linked to Google already
    subquery = db.query(models.ExternalEvent.task_id).filter(models.ExternalEvent.provider == "google_calendar")
    tasks = db.query(models.Task).filter(
        models.Task.user_id == DEFAULT_USER_ID,
        models.Task.deleted_at.is_(None),
        models.Task.due_at.isnot(None),
        models.Task.status != "done",
        ~models.Task.id.in_(subquery)
    ).limit(10).all()
    
    pushed = 0
    from datetime import datetime
    for t in tasks:
        # Google expects ISO strings
        due_iso = t.due_at.isoformat() if t.due_at else None
        if not due_iso: continue
        
        body = {
            "summary": t.title,
            "description": t.description,
            "start": {"dateTime": due_iso if "T" in due_iso else f"{due_iso}T09:00:00Z"},
            "end": {"dateTime": due_iso if "T" in due_iso else f"{due_iso}T10:00:00Z"},
        }
        resp = requests.post(CAL_EVENTS, headers=headers, json=body, timeout=15)
        if resp.status_code == 200:
            ext_id = resp.json().get("id")
            ext_event = models.ExternalEvent(
                task_id=t.id,
                provider="google_calendar",
                external_id=ext_id,
                last_synced_at=datetime.utcnow()
            )
            db.add(ext_event)
            pushed += 1
        else:
            continue
    db.commit()
    return {"pushed": pushed}


@router.post("/push-focus-blocks", dependencies=[Depends(require_api_key)])
def push_focus_blocks(db: Session = Depends(get_db)):
    """Push auto-planned focus blocks as Google Calendar events with proper times."""
    integ = get_integration(db)
    token = ensure_token(db, integ)
    headers_gcal = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    from app.routes.auto_plan import _auto_plan_logic
    items, msg, focus_mins = _auto_plan_logic(db)

    pushed = 0
    from datetime import datetime as dt, timedelta
    today = dt.utcnow().date()
    for item in items:
        start_time = item.start_time
        end_time = item.end_time

        body = {
            "summary": f"🔒 {item.title}",
            "description": f"Focus block — {item.block_label}\n{item.rationale}",
            "start": {"dateTime": f"{today}T{start_time}:00Z"},
            "end": {"dateTime": f"{today}T{end_time}:00Z"},
            "colorId": "1",  # Lavender
        }
        resp = requests.post(CAL_EVENTS, headers=headers_gcal, json=body, timeout=15)
        if resp.status_code in (200, 201):
            pushed += 1

    return {"pushed": pushed, "total_blocks": len(items), "focus_minutes": focus_mins}


@router.post("/import-constraints", dependencies=[Depends(require_api_key)])
def import_constraints(db: Session = Depends(get_db)):
    """Pull today's calendar events and store as busy slots for the scheduler."""
    integ = get_integration(db)
    token = ensure_token(db, integ)
    cal_headers = {"Authorization": f"Bearer {token}"}

    from datetime import datetime as dt, timedelta
    today = dt.utcnow().date()
    time_min = f"{today}T00:00:00Z"
    time_max = f"{today}T23:59:59Z"

    resp = requests.get(
        CAL_EVENTS, headers=cal_headers, timeout=15,
        params={
            "timeMin": time_min,
            "timeMax": time_max,
            "singleEvents": True,
            "orderBy": "startTime",
            "maxResults": 50,
        },
    )
    if resp.status_code != 200:
        raise HTTPException(status_code=400, detail=resp.text)

    events = resp.json().get("items", [])
    busy_slots = []

    for ev in events:
        start = ev.get("start", {})
        end = ev.get("end", {})
        start_dt = start.get("dateTime")
        end_dt = end.get("dateTime")
        if start_dt and end_dt:
            busy_slots.append({
                "title": ev.get("summary", "Busy"),
                "start": start_dt,
                "end": end_dt,
            })

    # Store busy slots in integration config for scheduler to read
    cfg = integ.config_json or {}
    cfg["busy_slots"] = busy_slots
    cfg["busy_slots_date"] = str(today)
    integ.config_json = cfg
    db.commit()

    return {"imported": len(busy_slots), "date": str(today), "slots": busy_slots}

