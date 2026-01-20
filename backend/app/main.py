from fastapi import FastAPI
from app.routes.capture import router as capture_router

app = FastAPI(title="Quantum Flow")

app.include_router(capture_router)
