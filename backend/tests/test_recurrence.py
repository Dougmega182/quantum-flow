import os
from fastapi.testclient import TestClient
from app.main import app

API_KEY = os.getenv("API_KEY", "change-me")
HEADERS = {"X-API-Key": API_KEY}
client = TestClient(app)

def test_materialize():
    r = client.post("/v1/recurrence/materialize", headers=HEADERS)
    assert r.status_code == 200
    body = r.json()
    assert "created" in body