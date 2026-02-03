import os
import time
from fastapi import FastAPI, Depends, Header, HTTPException, status, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from app.routes import intents, tasks, task_templates, recurrence, integrations, automations
from app.routes import ai

API_KEY = os.getenv("API_KEY")
ALLOW_ORIGINS = [o.strip() for o in os.getenv("ALLOW_ORIGINS", "*").split(",")]

def require_api_key(x_api_key: str = Header(None)):
    if API_KEY and x_api_key == API_KEY:
        return True
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")

app = FastAPI(title="Quantum Flow Intent Service", version="0.1")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOW_ORIGINS if ALLOW_ORIGINS != ["*"] else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.perf_counter()
    response: Response = await call_next(request)
    duration_ms = (time.perf_counter() - start) * 1000
    # Simple stdout log; replace with structured logging if needed
    print(f"{request.method} {request.url.path} -> {response.status_code} in {duration_ms:.1f}ms")
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

# Apply API key to all intent routes
app.include_router(intents.router, dependencies=[Depends(require_api_key)])
app.include_router(tasks.router, dependencies=[Depends(require_api_key)])
app.include_router(task_templates.router, dependencies=[Depends(require_api_key)])
app.include_router(recurrence.router, dependencies=[Depends(require_api_key)])
app.include_router(integrations.router, dependencies=[Depends(require_api_key)])
app.include_router(automations.router, dependencies=[Depends(require_api_key)])
app.include_router(ai.router, dependencies=[Depends(require_api_key)])