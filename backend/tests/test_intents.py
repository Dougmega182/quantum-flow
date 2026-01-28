# backend/tests/test_intents.py
import os
from fastapi.testclient import TestClient
from app.main import app

API_KEY = os.getenv("API_KEY", "change-me")
HEADERS = {"X-API-Key": API_KEY}

client = TestClient(app)

def test_health():
    resp = client.get("/health")
    assert resp.status_code == 200

def test_list_intents():
    resp = client.get("/v1/intents", headers=HEADERS)
    assert resp.status_code == 200

def test_create_conflict_case_insensitive():
    resp = client.post("/v1/intents", headers=HEADERS,
                       json={"name": "CAPTURE.TASK", "description": "dup"})
    assert resp.status_code == 409

def test_create_and_update():
    name = "test.intent.pytest"
    resp = client.post("/v1/intents", headers=HEADERS,
                       json={"name": name, "description": "first"})
    if resp.status_code == 201:
        intent_id = resp.json()["id"]
    else:
        intent_id = client.get("/v1/intents", headers=HEADERS,
                               params={"q": name}).json()["items"][0]["id"]
    resp_u = client.patch(f"/v1/intents/{intent_id}", headers=HEADERS,
                          json={"description": "updated"})
    assert resp_u.status_code == 200

def test_delete_disabled():
    resp = client.delete("/v1/intents/1", headers=HEADERS)
    assert resp.status_code == 405