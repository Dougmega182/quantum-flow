from fastapi import Header, HTTPException, Request, Depends
from app.config import settings

async def require_api_key(request: Request, x_api_key: str | None = Header(default=None)):
    path = request.url.path
    if "callback" in path and "google" in path:
        # LOGGING FOR DEBUGGING
        print(f"AUTH_BYPASS_GRANTED: path={path}", flush=True)
        return

    expected = settings.API_KEY
    if not x_api_key or x_api_key != expected:
        print(f"AUTH_FAILURE: path={path} received_key={x_api_key} expected_key={expected}", flush=True)
        raise HTTPException(status_code=401, detail="Unauthorized")
