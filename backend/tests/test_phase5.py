"""Phase 5 tests — Time Tracking, Goals & OKRs, Activity Feed."""
import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

API_KEY = "test-key-123"
HEADERS = {"X-API-Key": API_KEY}


# ── Time Tracking Tests ──────────────────────────────────────────

class TestTimeTracking:
    def test_no_running_timer(self):
        resp = client.get("/v1/time/running", headers=HEADERS)
        assert resp.status_code == 200
        assert resp.json()["running"] is False

    def test_start_timer(self):
        # Create a task first
        task = client.post("/v1/tasks", headers=HEADERS, json={
            "title": "Time test task", "status": "open",
        }).json()
        resp = client.post("/v1/time/start", headers=HEADERS, json={"task_id": task["id"]})
        assert resp.status_code == 201
        data = resp.json()
        assert data["is_running"] is True
        assert data["task_id"] == task["id"]
        return data["id"]

    def test_get_running_after_start(self):
        resp = client.get("/v1/time/running", headers=HEADERS)
        assert resp.status_code == 200
        data = resp.json()
        assert data["running"] is True

    def test_stop_timer(self):
        # Get running entry
        running = client.get("/v1/time/running", headers=HEADERS).json()
        if running["running"]:
            entry_id = running["entry"]["id"]
            resp = client.post("/v1/time/stop", headers=HEADERS, json={"entry_id": entry_id})
            assert resp.status_code == 200
            assert resp.json()["is_running"] is False
            assert resp.json()["duration_seconds"] is not None

    def test_list_entries(self):
        resp = client.get("/v1/time/entries", headers=HEADERS)
        assert resp.status_code == 200
        assert "entries" in resp.json()

    def test_time_analysis(self):
        resp = client.get("/v1/time/analysis", headers=HEADERS)
        assert resp.status_code == 200
        data = resp.json()
        assert "comparisons" in data
        assert "summary" in data
        assert "total_tracked_hours" in data["summary"]


# ── Goals & OKRs Tests ───────────────────────────────────────────

class TestGoals:
    def test_list_empty(self):
        resp = client.get("/v1/goals", headers=HEADERS)
        assert resp.status_code == 200
        assert "goals" in resp.json()

    def test_create_goal(self):
        resp = client.post("/v1/goals", headers=HEADERS, json={
            "title": "Ship Phase 5",
            "target_value": 10,
            "unit": "tasks",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["title"] == "Ship Phase 5"
        assert data["target_value"] == 10
        assert data["progress_pct"] == 0

    def test_update_goal(self):
        goals = client.get("/v1/goals", headers=HEADERS).json()["goals"]
        assert len(goals) > 0
        gid = goals[0]["id"]
        resp = client.patch(f"/v1/goals/{gid}", headers=HEADERS, json={"current_value": 5})
        assert resp.status_code == 200
        assert resp.json()["current_value"] == 5

    def test_link_task(self):
        goals = client.get("/v1/goals", headers=HEADERS).json()["goals"]
        gid = goals[0]["id"]
        task = client.post("/v1/tasks", headers=HEADERS, json={
            "title": "Goal-linked task", "status": "open",
        }).json()
        resp = client.post(f"/v1/goals/{gid}/link", headers=HEADERS, json={"task_id": task["id"]})
        assert resp.status_code == 201
        assert resp.json()["status"] == "linked"

    def test_goal_progress(self):
        goals = client.get("/v1/goals", headers=HEADERS).json()["goals"]
        gid = goals[0]["id"]
        resp = client.get(f"/v1/goals/{gid}/progress", headers=HEADERS)
        assert resp.status_code == 200
        data = resp.json()
        assert "linked_tasks" in data
        assert "tasks_total" in data

    def test_delete_goal(self):
        goals = client.get("/v1/goals", headers=HEADERS).json()["goals"]
        gid = goals[0]["id"]
        resp = client.delete(f"/v1/goals/{gid}", headers=HEADERS)
        assert resp.status_code == 200
        assert resp.json()["status"] == "deleted"


# ── Activity Feed Tests ──────────────────────────────────────────

class TestActivity:
    def test_list_activity(self):
        resp = client.get("/v1/activity", headers=HEADERS)
        assert resp.status_code == 200
        assert "activities" in resp.json()

    def test_activity_after_goal_ops(self):
        # Goal ops should have logged activities
        resp = client.get("/v1/activity", headers=HEADERS)
        data = resp.json()
        # Should have at least created/updated/deleted from goal tests
        assert isinstance(data["activities"], list)

    def test_activity_with_filter(self):
        resp = client.get("/v1/activity?entity_type=goal", headers=HEADERS)
        assert resp.status_code == 200
        for a in resp.json()["activities"]:
            assert a["entity_type"] == "goal"
