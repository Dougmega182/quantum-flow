import os
import time
from fastapi import FastAPI, Depends, Header, HTTPException, status, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from app.routes import intents, tasks, task_templates, recurrence, integrations, automations
from app.routes import ai
from fastapi import Request, Header, HTTPException
from app.config import settings
from app.routes import google_calendar, analytics, ingest, users, projects, search
app = FastAPI(title="Quantum Flow Intent Service", version="0.1")

# CORS
ALLOW_ORIGINS = [o.strip() for o in os.getenv("ALLOW_ORIGINS", "*").split(",") if o.strip()]
# Add ngrok if present
if "parakeet-novel-accurately.ngrok-free.app" not in str(ALLOW_ORIGINS):
    ALLOW_ORIGINS.append("https://parakeet-novel-accurately.ngrok-free.app")

print(f"CORS_CONFIG: ALLOW_ORIGINS={ALLOW_ORIGINS}", flush=True)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOW_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.auth import require_api_key

app.include_router(ingest.router)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.perf_counter()
    # Log incoming origin and host
    origin = request.headers.get("origin")
    host = request.headers.get("host")
    response: Response = await call_next(request)
    duration_ms = (time.perf_counter() - start) * 1000
    print(f"[{request.method}] {request.url.path} -> {response.status_code} (Origin: {origin}, Host: {host}) in {duration_ms:.1f}ms", flush=True)
    return response

@app.get("/health", tags=["health"])
def health():
    return {"status": "ok"}

# Minimal Prometheus-style metrics (static counters for now)
@app.get("/metrics", tags=["metrics"])
def metrics():
    # In a real setup, wire to counters/histograms; here is a placeholder
    return Response(
        "quantumflow_requests_total 0\nquantumflow_errors_total 0\n",
        media_type="text/plain"
    )

# Public / Selective routes first
app.include_router(google_calendar.router)
app.include_router(analytics.router, dependencies=[Depends(require_api_key)])

# Protected routes
app.include_router(users.router, dependencies=[Depends(require_api_key)])
app.include_router(intents.router, dependencies=[Depends(require_api_key)])
app.include_router(tasks.router, dependencies=[Depends(require_api_key)])
app.include_router(task_templates.router, dependencies=[Depends(require_api_key)])
app.include_router(recurrence.router, dependencies=[Depends(require_api_key)])
app.include_router(integrations.router, dependencies=[Depends(require_api_key)])
app.include_router(automations.router, dependencies=[Depends(require_api_key)])
app.include_router(projects.router, dependencies=[Depends(require_api_key)])
app.include_router(search.router, dependencies=[Depends(require_api_key)])
app.include_router(ai.router, dependencies=[Depends(require_api_key)])
