from fastapi import FastAPI

app = FastAPI(title="Quantum Flow API")

@app.get("/health")
def health():
    return {"status": "ok"}
