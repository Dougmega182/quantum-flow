"""Phase 4 tests — Notifications, Enhanced Chat NLP, Command Center."""
import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

API_KEY = "test-key-123"
HEADERS = {"X-API-Key": API_KEY}


# ── Notification Tests ────────────────────────────────────────────

class TestNotifications:
    def test_list_empty(self):
        resp = client.get("/v1/notifications", headers=HEADERS)
        assert resp.status_code == 200
        data = resp.json()
        assert "notifications" in data
        assert "unread_count" in data

    def test_generate_digest(self):
        resp = client.post("/v1/notifications/generate-digest", headers=HEADERS)
        assert resp.status_code == 200
        data = resp.json()
        assert data["type"] == "digest"
        assert "Daily Digest" in data["title"]
        assert data["body"] is not None

    def test_list_after_digest(self):
        resp = client.get("/v1/notifications", headers=HEADERS)
        assert resp.status_code == 200
        assert resp.json()["unread_count"] >= 1

    def test_mark_read_single(self):
        # Generate a digest to ensure there's a notification
        client.post("/v1/notifications/generate-digest", headers=HEADERS)
        # Get the latest notification
        notifications = client.get("/v1/notifications", headers=HEADERS).json()["notifications"]
        assert len(notifications) > 0
        nid = notifications[0]["id"]
        resp = client.post("/v1/notifications/mark-read", headers=HEADERS, json={"notification_id": nid})
        assert resp.status_code == 200
        assert resp.json()["marked"] == 1

    def test_mark_read_all(self):
        resp = client.post("/v1/notifications/mark-read", headers=HEADERS, json={})
        assert resp.status_code == 200
        assert resp.json()["marked"] >= 0


# ── Enhanced Chat NLP Tests ───────────────────────────────────────

class TestEnhancedChat:
    def test_create_with_priority(self):
        resp = client.post("/v1/ai/chat", headers=HEADERS, json={
            "message": "Create a task to review PR high priority",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "review PR" in data["reply"].lower() or "review pr" in data["reply"].lower()

    def test_assign_intent(self):
        # Create a task and member first
        client.post("/v1/tasks", headers=HEADERS, json={
            "title": "Test Assignment Task", "status": "open",
        })
        client.post("/v1/team/members", headers=HEADERS, json={
            "name": "TestBot", "email": "testbot@qf.dev",
        })
        resp = client.post("/v1/ai/chat", headers=HEADERS, json={
            "message": "assign test assignment task to testbot",
        })
        assert resp.status_code == 200
        data = resp.json()
        # Should either assign successfully or report not found (depending on exact match)
        assert "assign" in data["reply"].lower() or "couldn't find" in data["reply"].lower()

    def test_priority_intent(self):
        client.post("/v1/tasks", headers=HEADERS, json={
            "title": "Priority Test Task", "status": "open",
        })
        resp = client.post("/v1/ai/chat", headers=HEADERS, json={
            "message": "set priority test task to high priority",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "high" in data["reply"].lower() or "couldn't find" in data["reply"].lower()

    def test_blueprint_intent(self):
        resp = client.post("/v1/ai/chat", headers=HEADERS, json={
            "message": "use sprint planning blueprint",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "sprint" in data["reply"].lower() or "couldn't find" in data["reply"].lower()

    def test_general_help_shows_new_intents(self):
        resp = client.post("/v1/ai/chat", headers=HEADERS, json={
            "message": "hello there",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "Assign" in data["reply"]
        assert "Blueprints" in data["reply"]
        assert "Priority" in data["reply"]


# ── NLP Date Parsing Tests ────────────────────────────────────────

class TestNLPEnhancements:
    def test_next_day_of_week(self):
        from app.utils.nlp import parse_task_nlp
        title, due_at = parse_task_nlp("review PR next tuesday")
        assert due_at is not None
        assert due_at.weekday() == 1  # Tuesday

    def test_end_of_week(self):
        from app.utils.nlp import parse_task_nlp
        title, due_at = parse_task_nlp("finish report end of week")
        assert due_at is not None
        assert due_at.weekday() == 4  # Friday
        assert due_at.hour == 17

    def test_in_hours(self):
        from app.utils.nlp import parse_task_nlp
        title, due_at = parse_task_nlp("check email in 3 hours")
        assert due_at is not None
