"""Phase 3 tests — Team, Blueprints, Deep Analytics."""
import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

API_KEY = "test-key-123"
HEADERS = {"X-API-Key": API_KEY}


# ── Team Member Tests ─────────────────────────────────────────────

class TestTeam:
    def test_create_member(self):
        resp = client.post("/v1/team/members", headers=HEADERS, json={
            "name": "Alice", "email": "alice@quantum.dev", "role": "Engineer",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Alice"
        assert data["capacity_hours_per_day"] == 8.0

    def test_list_members(self):
        resp = client.get("/v1/team/members", headers=HEADERS)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_update_member(self):
        # Create first
        create = client.post("/v1/team/members", headers=HEADERS, json={
            "name": "Bob", "email": "bob@quantum.dev",
        })
        mid = create.json()["id"]
        resp = client.patch(f"/v1/team/members/{mid}", headers=HEADERS, json={"role": "Lead"})
        assert resp.status_code == 200
        assert resp.json()["role"] == "Lead"

    def test_delete_member(self):
        create = client.post("/v1/team/members", headers=HEADERS, json={
            "name": "Charlie", "email": "charlie@quantum.dev",
        })
        mid = create.json()["id"]
        resp = client.delete(f"/v1/team/members/{mid}", headers=HEADERS)
        assert resp.status_code == 200
        assert resp.json()["status"] == "deleted"

    def test_workload(self):
        resp = client.get("/v1/team/workload", headers=HEADERS)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_suggest_assignments(self):
        resp = client.post("/v1/team/suggest-assignments", headers=HEADERS)
        assert resp.status_code == 200
        data = resp.json()
        assert "suggestions" in data
        assert "message" in data


# ── Blueprint Tests ───────────────────────────────────────────────

class TestBlueprints:
    def test_list_blueprints(self):
        resp = client.get("/v1/blueprints", headers=HEADERS)
        assert resp.status_code == 200
        # Should include built-in blueprints
        assert isinstance(resp.json(), list)

    def test_create_blueprint(self):
        resp = client.post("/v1/blueprints", headers=HEADERS, json={
            "title": "Test Blueprint",
            "description": "For testing",
            "category": "Testing",
            "steps": [
                {"title": "Step 1", "order": 1, "duration_minutes": 15, "energy_level": "low"},
                {"title": "Step 2", "order": 2, "duration_minutes": 30, "energy_level": "high", "depends_on_step": 1},
            ],
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["title"] == "Test Blueprint"
        assert len(data["steps"]) == 2

    def test_instantiate_blueprint(self):
        # Create a simple blueprint
        create = client.post("/v1/blueprints", headers=HEADERS, json={
            "title": "Instantiate Test",
            "steps": [
                {"title": "Do A", "order": 1, "duration_minutes": 10, "energy_level": "low"},
                {"title": "Do B", "order": 2, "duration_minutes": 20, "energy_level": "medium", "depends_on_step": 1},
            ],
        })
        bp_id = create.json()["id"]

        resp = client.post(f"/v1/blueprints/{bp_id}/instantiate", headers=HEADERS)
        assert resp.status_code == 200
        data = resp.json()
        assert data["tasks_created"] == 2
        # Second task should depend on first
        assert data["tasks"][1]["depends_on_task_id"] == data["tasks"][0]["task_id"]

    def test_delete_blueprint(self):
        create = client.post("/v1/blueprints", headers=HEADERS, json={
            "title": "Delete Test",
            "steps": [{"title": "X", "order": 1, "duration_minutes": 5, "energy_level": "low"}],
        })
        bp_id = create.json()["id"]
        resp = client.delete(f"/v1/blueprints/{bp_id}", headers=HEADERS)
        assert resp.status_code == 200
        assert resp.json()["status"] == "deleted"

    def test_blueprint_not_found(self):
        resp = client.get("/v1/blueprints/999999", headers=HEADERS)
        assert resp.status_code == 404


# ── Deep Analytics Tests ──────────────────────────────────────────

class TestDeepAnalytics:
    def test_deep_analytics_shape(self):
        resp = client.get("/v1/analytics/deep", headers=HEADERS)
        assert resp.status_code == 200
        data = resp.json()
        assert "streaks" in data
        assert "current" in data["streaks"]
        assert "best" in data["streaks"]
        assert "velocity" in data
        assert "trend" in data["velocity"]
        assert "avg_per_day" in data["velocity"]
        assert "priority_breakdown" in data
        assert "avg_completion_hours" in data
        assert "comparison" in data
        assert "this_week" in data["comparison"]
        assert "last_week" in data["comparison"]
        assert "change_pct" in data["comparison"]

    def test_basic_stats_still_works(self):
        resp = client.get("/v1/analytics/stats", headers=HEADERS)
        assert resp.status_code == 200
        data = resp.json()
        assert "total_tasks" in data
        assert "completion_rate" in data
