from fastapi import FastAPI
from app.routes import capture, email

app = FastAPI(title="Quantum Flow API")

app.include_router(capture.router, prefix="/capture", tags=["Capture"])
app.include_router(email.router, prefix="/email", tags=["Email"])

@app.get("/")
def root():
    return {"message": "Quantum Flow API is live!"}
