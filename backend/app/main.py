from fastapi import FastAPI
from app.routes import capture, email

app = FastAPI(title="Quantum Flow API")

@app.get("/")
def root():
    return {"status": "ok"}

@app.get("/health")
def health():
    return {"status": "ok"}
    
app.include_router(capture.router)
app.include_router(email.router)
