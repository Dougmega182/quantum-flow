"""Phase 2 tests — Chat, Energy, Milestones."""
import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

API_KEY = "test-key-123"
HEADERS = {"X-API-Key": API_KEY}


# ── Chat Endpoint Tests ─────────────────────────────────────────

class TestChat:
    def test_create_task_via_chat(self):
        resp = client.post("/v1/ai/chat", headers=HEADERS, json={"message": "Add a task to review the PR"})
        assert resp.status_code == 200
        data = resp.json()
        assert "✅" in data["reply"]
        assert data.get("task_card") is not None
        assert data["task_card"]["title"]

    def test_query_tasks_via_chat(self):
        resp = client.post("/v1/ai/chat", headers=HEADERS, json={"message": "Show my tasks"})
        assert resp.status_code == 200
        data = resp.json()
        assert "open" in data["reply"].lower() or "tasks" in data["reply"].lower()

    def test_schedule_via_chat(self):
        resp = client.post("/v1/ai/chat", headers=HEADERS, json={"message": "Plan my day"})
        assert resp.status_code == 200
        data = resp.json()
        assert "reply" in data

    def test_reschedule_via_chat(self):
        resp = client.post("/v1/ai/chat", headers=HEADERS, json={"message": "Reschedule my overdue tasks"})
        assert resp.status_code == 200
        data = resp.json()
        assert "reply" in data

    def test_complete_task_via_chat(self):
        # First create a task
        create_resp = client.post("/v1/ai/chat", headers=HEADERS, json={"message": "Add a task to test completion"})
        assert create_resp.status_code == 200

        # Then complete it
        resp = client.post("/v1/ai/chat", headers=HEADERS, json={"message": "Mark done test completion"})
        assert resp.status_code == 200
        data = resp.json()
        assert "reply" in data

    def test_unknown_intent_shows_help(self):
        resp = client.post("/v1/ai/chat", headers=HEADERS, json={"message": "Tell me a joke"})
        assert resp.status_code == 200
        data = resp.json()
        assert "I can help" in data["reply"]

    def test_block_time_via_chat(self):
        resp = client.post("/v1/ai/chat", headers=HEADERS, json={"message": "Block time for deep work"})
        assert resp.status_code == 200
        data = resp.json()
        assert "blocked" in data["reply"].lower() or "task_card" in data


# ── Energy Profile Tests ─────────────────────────────────────────

class TestEnergy:
    def test_energy_profile_empty(self):
        resp = client.get("/v1/ai/energy-profile", headers=HEADERS)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["heatmap"]) == 24
        assert isinstance(data["peak_hours"], list)

    def test_learn_energy(self):
        resp = client.post("/v1/ai/learn-energy", headers=HEADERS)
        assert resp.status_code == 200
        data = resp.json()
        assert "message" in data
        assert "updated" in data

    def test_energy_profile_after_learning(self):
        # Learn first
        client.post("/v1/ai/learn-energy", headers=HEADERS)
        # Then check profile
        resp = client.get("/v1/ai/energy-profile", headers=HEADERS)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["heatmap"]) == 24


# ── Milestone Tests ──────────────────────────────────────────────

class TestMilestones:
    @pytest.fixture
    def project_id(self):
        """Create a project to attach milestones to."""
        resp = client.post(
            "/projects",
            headers=HEADERS,
            json={"title": "Test Project for Milestones", "slug": "ms-test"},
        )
        if resp.status_code == 201:
            return resp.json()["id"]
        # If project already exists, list and use first
        resp = client.get("/projects", headers=HEADERS)
        return resp.json()["items"][0]["id"]

    def test_create_milestone(self, project_id):
        resp = client.post(
            "/v1/milestones",
            headers=HEADERS,
            json={"project_id": project_id, "title": "Alpha Release", "due_at": "2026-04-01T00:00:00"},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["title"] == "Alpha Release"
        assert data["project_id"] == project_id

    def test_list_milestones(self, project_id):
        # Create one first
        client.post(
            "/v1/milestones",
            headers=HEADERS,
            json={"project_id": project_id, "title": "List Test"},
        )
        resp = client.get(f"/v1/milestones?project_id={project_id}", headers=HEADERS)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_complete_milestone(self, project_id):
        create_resp = client.post(
            "/v1/milestones",
            headers=HEADERS,
            json={"project_id": project_id, "title": "Complete Test"},
        )
        ms_id = create_resp.json()["id"]
        resp = client.post(f"/v1/milestones/{ms_id}/complete", headers=HEADERS)
        assert resp.status_code == 200
        assert resp.json()["completed_at"] is not None

    def test_update_milestone(self, project_id):
        create_resp = client.post(
            "/v1/milestones",
            headers=HEADERS,
            json={"project_id": project_id, "title": "Update Test"},
        )
        ms_id = create_resp.json()["id"]
        resp = client.patch(
            f"/v1/milestones/{ms_id}",
            headers=HEADERS,
            json={"title": "Updated Milestone"},
        )
        assert resp.status_code == 200
        assert resp.json()["title"] == "Updated Milestone"

    def test_delete_milestone(self, project_id):
        create_resp = client.post(
            "/v1/milestones",
            headers=HEADERS,
            json={"project_id": project_id, "title": "Delete Test"},
        )
        ms_id = create_resp.json()["id"]
        resp = client.delete(f"/v1/milestones/{ms_id}", headers=HEADERS)
        assert resp.status_code == 200
        assert resp.json()["status"] == "deleted"

    def test_milestone_not_found(self):
        resp = client.patch("/v1/milestones/999999", headers=HEADERS, json={"title": "x"})
        assert resp.status_code == 404
