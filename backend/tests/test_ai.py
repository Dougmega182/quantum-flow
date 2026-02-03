import os
from fastapi.testclient import TestClient
from app.main import app

API_KEY = os.getenv("API_KEY", "change-me")
HEADERS = {"X-API-Key": API_KEY}
client = TestClient(app)

def test_ai_suggest():
    r = client.get("/v1/ai/suggest", headers=HEADERS)
    assert r.status_code == 200
    assert isinstance(r.json(), list)

def test_ai_summarize():
    r = client.post("/v1/ai/summarize", headers=HEADERS, json={"text": "This is a long text"})
    assert r.status_code == 200
    assert "summary" in r.json()