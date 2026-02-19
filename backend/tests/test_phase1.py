"""Tests for Phase 1 features: Auto-Plan, Subtasks/Dependencies, and Nudges."""
import os
from fastapi.testclient import TestClient
from app.main import app

API_KEY = os.getenv("API_KEY", "change-me")
HEADERS = {"X-API-Key": API_KEY}
client = TestClient(app)


# ── Auto-Plan ─────────────────────────────────────────────────────

def test_auto_plan_returns_schedule():
    r = client.post("/v1/ai/auto-plan", headers=HEADERS)
    assert r.status_code == 200
    data = r.json()
    assert "items" in data
    assert "message" in data
    assert "total_focus_minutes" in data
    assert isinstance(data["items"], list)


def test_reschedule_returns_items():
    r = client.post("/v1/ai/reschedule", headers=HEADERS)
    assert r.status_code == 200
    data = r.json()
    assert "items" in data
    assert "message" in data


# ── Subtasks ──────────────────────────────────────────────────────

def test_subtask_crud():
    """Create a parent task, add subtasks, list them."""
    # Create parent
    parent = client.post("/v1/tasks", json={"title": "parent task"}, headers=HEADERS)
    assert parent.status_code == 201
    pid = parent.json()["id"]

    # Create subtask via /subtasks endpoint
    sub = client.post(f"/v1/tasks/{pid}/subtasks", json={"title": "child task"}, headers=HEADERS)
    assert sub.status_code == 201
    assert sub.json()["parent_id"] == pid

    # List subtasks
    subs = client.get(f"/v1/tasks/{pid}/subtasks", headers=HEADERS)
    assert subs.status_code == 200
    assert subs.json()["total"] >= 1
    assert any(s["title"] == "child task" for s in subs.json()["items"])

    # Cleanup
    client.delete(f"/v1/tasks/{sub.json()['id']}", headers=HEADERS)
    client.delete(f"/v1/tasks/{pid}", headers=HEADERS)


def test_subtask_404_parent():
    """Posting a subtask to a non-existent parent returns 404."""
    r = client.post("/v1/tasks/999999/subtasks", json={"title": "orphan"}, headers=HEADERS)
    assert r.status_code == 404


# ── Dependencies ──────────────────────────────────────────────────

def test_dependency_blocks_completion():
    """Can't complete a task if its dependency isn't done."""
    # Create two tasks: A depends on B
    b = client.post("/v1/tasks", json={"title": "blocker task"}, headers=HEADERS)
    assert b.status_code == 201
    bid = b.json()["id"]

    a = client.post("/v1/tasks", json={"title": "blocked task", "depends_on_id": bid}, headers=HEADERS)
    assert a.status_code == 201
    aid = a.json()["id"]

    # Try completing A before B  → should get 409
    r = client.post(f"/v1/tasks/{aid}/complete", headers=HEADERS)
    assert r.status_code == 409
    assert "DEPENDENCY_INCOMPLETE" in r.json()["detail"]

    # Complete B first, then A → should succeed
    client.post(f"/v1/tasks/{bid}/complete", headers=HEADERS)
    r2 = client.post(f"/v1/tasks/{aid}/complete", headers=HEADERS)
    assert r2.status_code == 200
    assert r2.json()["status"] == "done"

    # Cleanup
    client.delete(f"/v1/tasks/{aid}", headers=HEADERS)
    client.delete(f"/v1/tasks/{bid}", headers=HEADERS)


def test_self_dependency_rejected():
    """Setting depends_on_id to self should return 422."""
    t = client.post("/v1/tasks", json={"title": "self-dep test"}, headers=HEADERS)
    tid = t.json()["id"]

    r = client.patch(f"/v1/tasks/{tid}", json={"depends_on_id": tid}, headers=HEADERS)
    assert r.status_code == 422
    assert "SELF_DEPENDENCY" in r.json()["detail"]

    client.delete(f"/v1/tasks/{tid}", headers=HEADERS)


def test_circular_dependency_rejected():
    """A → B → A cycle should return 422."""
    a = client.post("/v1/tasks", json={"title": "cycle A"}, headers=HEADERS)
    aid = a.json()["id"]
    b = client.post("/v1/tasks", json={"title": "cycle B", "depends_on_id": aid}, headers=HEADERS)
    bid = b.json()["id"]

    # Try to make A depend on B → cycle
    r = client.patch(f"/v1/tasks/{aid}", json={"depends_on_id": bid}, headers=HEADERS)
    assert r.status_code == 422
    assert "CIRCULAR_DEPENDENCY" in r.json()["detail"]

    client.delete(f"/v1/tasks/{aid}", headers=HEADERS)
    client.delete(f"/v1/tasks/{bid}", headers=HEADERS)


def test_depends_on_id_in_response():
    """TaskOut should include depends_on_id."""
    dep = client.post("/v1/tasks", json={"title": "dep target"}, headers=HEADERS)
    did = dep.json()["id"]

    t = client.post("/v1/tasks", json={"title": "dependent", "depends_on_id": did}, headers=HEADERS)
    assert t.status_code == 201
    assert t.json()["depends_on_id"] == did

    client.delete(f"/v1/tasks/{t.json()['id']}", headers=HEADERS)
    client.delete(f"/v1/tasks/{did}", headers=HEADERS)


# ── Nudges ────────────────────────────────────────────────────────

def test_nudges_returns_list():
    r = client.get("/v1/ai/nudges", headers=HEADERS)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    # Each nudge should have the required fields
    for nudge in data:
        assert "type" in nudge
        assert "message" in nudge
        assert "severity" in nudge
        assert "action_type" in nudge
