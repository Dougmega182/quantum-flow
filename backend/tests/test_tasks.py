import os
from fastapi.testclient import TestClient
from app.main import app

API_KEY = os.getenv("API_KEY", "change-me")
HEADERS = {"X-API-Key": API_KEY}
client = TestClient(app)

def test_list_tasks_empty_or_seeded():
    resp = client.get("/v1/tasks", headers=HEADERS)
    assert resp.status_code == 200
    assert "items" in resp.json()

def test_create_complete_reopen_task():
    payload = {"title": "pytest task", "description": "desc"}
    r = client.post("/v1/tasks", json=payload, headers=HEADERS)
    assert r.status_code == 201
    tid = r.json()["id"]

    r2 = client.post(f"/v1/tasks/{tid}/complete", headers=HEADERS)
    assert r2.status_code == 200
    assert r2.json()["status"] == "done"

    r3 = client.post(f"/v1/tasks/{tid}/reopen", headers=HEADERS)
    assert r3.status_code == 200
    assert r3.json()["status"] == "open"

def test_delete_soft():
    payload = {"title": "to-delete"}
    r = client.post("/v1/tasks", json=payload, headers=HEADERS)
    assert r.status_code == 201
    tid = r.json()["id"]
    r2 = client.delete(f"/v1/tasks/{tid}", headers=HEADERS)
    assert r2.status_code == 200
    assert r2.json()["status"] == "deleted"