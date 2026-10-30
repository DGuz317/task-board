"""Contract tests for PUT /api/tasks/{id} and DELETE /api/tasks/{id}."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from backend.app.dependencies import get_task_repository
from backend.app.main import create_app
from backend.app.repositories.task_repository import TaskRepository


@pytest.fixture
def client():
    """A TestClient wrapping a fresh app with a fresh, isolated repository,
    so no state leaks across tests via the process-wide singleton."""
    app = create_app()
    repo = TaskRepository()
    app.dependency_overrides[get_task_repository] = lambda: repo
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


class TestUpdate:
    def test_valid_update_returns_200_with_new_fields_and_original_id_and_created_at(
        self, client
    ):
        created = client.post("/api/tasks", json={"title": "A", "description": "d"}).json()

        response = client.put(
            f"/api/tasks/{created['id']}",
            json={"title": "A2", "description": "d2"},
        )

        assert response.status_code == 200
        body = response.json()
        assert body["title"] == "A2"
        assert body["description"] == "d2"
        assert body["id"] == created["id"]
        assert body["created_at"] == created["created_at"]

    def test_update_keeps_task_at_original_position_in_list(self, client):
        created = [
            client.post("/api/tasks", json={"title": f"task-{i}"}).json() for i in range(3)
        ]
        middle = created[1]

        client.put(f"/api/tasks/{middle['id']}", json={"title": "updated-middle"})

        listed = client.get("/api/tasks").json()
        assert [t["id"] for t in listed] == [t["id"] for t in created]
        assert listed[1]["title"] == "updated-middle"

    def test_unknown_id_returns_404_with_detail(self, client):
        response = client.put("/api/tasks/does-not-exist", json={"title": "x"})

        assert response.status_code == 404
        assert "detail" in response.json()

    @pytest.mark.parametrize("title", ["", "   ", "\t\n"])
    def test_empty_or_whitespace_title_returns_422(self, client, title):
        created = client.post("/api/tasks", json={"title": "A"}).json()

        response = client.put(f"/api/tasks/{created['id']}", json={"title": title})

        assert response.status_code == 422

    def test_update_does_not_touch_other_tasks(self, client):
        created = [
            client.post("/api/tasks", json={"title": f"task-{i}"}).json() for i in range(3)
        ]
        middle = created[1]

        client.put(f"/api/tasks/{middle['id']}", json={"title": "updated-middle"})

        listed = client.get("/api/tasks").json()
        assert listed[0]["title"] == created[0]["title"]
        assert listed[2]["title"] == created[2]["title"]


class TestDelete:
    def test_delete_returns_204_with_empty_body(self, client):
        created = client.post("/api/tasks", json={"title": "A"}).json()

        response = client.delete(f"/api/tasks/{created['id']}")

        assert response.status_code == 204
        assert response.content == b""

    def test_repeat_delete_of_same_id_returns_404(self, client):
        created = client.post("/api/tasks", json={"title": "A"}).json()
        client.delete(f"/api/tasks/{created['id']}")

        response = client.delete(f"/api/tasks/{created['id']}")

        assert response.status_code == 404
        assert "detail" in response.json()

    def test_unknown_id_returns_404_with_detail(self, client):
        response = client.delete("/api/tasks/does-not-exist")

        assert response.status_code == 404
        assert "detail" in response.json()

    def test_delete_removes_task_and_preserves_relative_order_of_survivors(self, client):
        created = [
            client.post("/api/tasks", json={"title": f"task-{i}"}).json() for i in range(3)
        ]
        middle = created[1]

        response = client.delete(f"/api/tasks/{middle['id']}")
        assert response.status_code == 204

        listed = client.get("/api/tasks").json()
        assert [t["id"] for t in listed] == [created[0]["id"], created[2]["id"]]
