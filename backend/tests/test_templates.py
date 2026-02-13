import os
from fastapi.testclient import TestClient
from app.main import app
from app.db import SessionLocal
from app import models

API_KEY = os.getenv("API_KEY", "change-me")
HEADERS = {"X-API-Key": API_KEY}
client = TestClient(app)

def test_template_crud():
    # 1. List (initially empty or has some seeds)
    resp = client.get("/v1/task-templates", headers=HEADERS)
    assert resp.status_code == 200
    initial_count = len(resp.json())

    # 2. Create
    payload = {
        "title": "Pytest Template",
        "description": "Created by pytest",
        "priority": "high",
        "default_due_days": 1
    }
    resp = client.post("/v1/task-templates", headers=HEADERS, json=payload)
    assert resp.status_code == 201
    tpl_id = resp.json()["id"]
    assert resp.json()["title"] == "Pytest Template"

    # 3. Use (Create Task from Template)
    resp = client.post(f"/v1/task-templates/{tpl_id}/create-task", headers=HEADERS)
    assert resp.status_code == 201
    assert resp.json()["title"] == "Pytest Template"
    assert resp.json()["status"] == "open"

    # 4. List again
    resp = client.get("/v1/task-templates", headers=HEADERS)
    assert len(resp.json()) == initial_count + 1

    # 5. Delete
    resp = client.delete(f"/v1/task-templates/{tpl_id}", headers=HEADERS)
    assert resp.status_code == 200
    assert resp.json()["status"] == "deleted"

    # 6. Verify Deleted
    resp = client.get("/v1/task-templates", headers=HEADERS)
    assert len(resp.json()) == initial_count
