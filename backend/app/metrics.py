from fastapi import APIRouter
import time

router = APIRouter()

@router.get("/metrics", tags=["metrics"])
def metrics():
    # Minimal Prometheus-like output; extend with real counters as needed.
    now = int(time.time())
    lines = [
        "# HELP app_up 1 if the app is up",
        "# TYPE app_up gauge",
        "app_up 1",
        "# HELP app_timestamp_seconds Current timestamp in seconds",
        "# TYPE app_timestamp_seconds gauge",
        f"app_timestamp_seconds {now}",
    ]
    return "\n".join(lines)