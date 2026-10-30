"""Endpoint contract tests covering every status code, ordering/persistence
across requests, id non-reuse, the JSON 404 envelope, and the catch-all 500
for an injected repository failure.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from backend.app.dependencies import get_task_repository
from backend.app.main import create_app
from backend.app.repositories.task_repository import TaskRepository


class _FailingTaskRepository:
    """Stub repository whose methods always raise, to exercise the
    catch-all exception handler instead of application logic."""

    def list(self):
        raise RuntimeError("boom")

    def get(self, task_id: str):
        raise RuntimeError("boom")

    def create(self, data):
        raise RuntimeError("boom")

    def update(self, task_id: str, data):
        raise RuntimeError("boom")

    def delete(self, task_id: str):
        raise RuntimeError("boom")


@pytest.fixture
def repo() -> TaskRepository:
    """A fresh, isolated in-memory repository for a single test."""
    return TaskRepository()


@pytest.fixture
def client(repo: TaskRepository):
    """A TestClient wrapping a fresh app whose repository dependency is
    overridden with `repo`, so no state leaks across tests."""
    app = create_app()
    app.dependency_overrides[get_task_repository] = lambda: repo
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def failing_client():
    """A TestClient whose repository dependency always raises, with server
    exceptions disabled so the catch-all handler's JSON response is
    returned instead of propagating the exception to the test."""
    app = create_app()
    app.dependency_overrides[get_task_repository] = lambda: _FailingTaskRepository()
    with TestClient(app, raise_server_exceptions=False) as test_client:
        yield test_client
    app.dependency_overrides.clear()


class TestIsolation:
    def test_fresh_repo_starts_empty(self, client: TestClient) -> None:
        assert client.get("/api/tasks").json() == []

    def test_task_created_here_is_not_visible_in_a_sibling_test(self, client: TestClient) -> None:
        # If isolation were broken, this would see the task from the test
        # above (run in either order, since pytest doesn't guarantee order).
        assert client.get("/api/tasks").json() == []
        client.post("/api/tasks", json={"title": "only visible in this test"})


class TestGet:
    def test_get_returns_200_with_empty_list(self, client: TestClient) -> None:
        response = client.get("/api/tasks")
        assert response.status_code == 200
        assert response.json() == []

    def test_get_returns_200_with_populated_list(self, client: TestClient) -> None:
        client.post("/api/tasks", json={"title": "A"})
        response = client.get("/api/tasks")
        assert response.status_code == 200
        assert len(response.json()) == 1


class TestPost:
    def test_post_returns_201_with_id_and_echoed_fields(self, client: TestClient) -> None:
        response = client.post("/api/tasks", json={"title": "A", "description": "d"})
        assert response.status_code == 201
        body = response.json()
        assert body["title"] == "A"
        assert body["description"] == "d"
        assert body["id"]

    def test_post_missing_title_returns_422(self, client: TestClient) -> None:
        response = client.post("/api/tasks", json={"description": "no title"})
        assert response.status_code == 422
        assert "detail" in response.json()

    def test_post_empty_title_returns_422(self, client: TestClient) -> None:
        response = client.post("/api/tasks", json={"title": "   "})
        assert response.status_code == 422

    def test_post_wrong_type_returns_422(self, client: TestClient) -> None:
        response = client.post("/api/tasks", json={"title": 123})
        assert response.status_code == 422


class TestPut:
    def test_put_returns_200_with_updated_fields(self, client: TestClient) -> None:
        created = client.post("/api/tasks", json={"title": "A", "description": "d"}).json()

        response = client.put(
            f"/api/tasks/{created['id']}",
            json={"title": "B", "description": "d2"},
        )

        assert response.status_code == 200
        body = response.json()
        assert body["id"] == created["id"]
        assert body["title"] == "B"
        assert body["description"] == "d2"

    def test_put_unknown_id_returns_404(self, client: TestClient) -> None:
        response = client.put("/api/tasks/unknown-id", json={"title": "B"})
        assert response.status_code == 404

    def test_put_invalid_body_returns_422(self, client: TestClient) -> None:
        created = client.post("/api/tasks", json={"title": "A"}).json()

        response = client.put(f"/api/tasks/{created['id']}", json={"title": "a" * 101})

        assert response.status_code == 422


class TestDelete:
    def test_delete_returns_204_with_empty_body(self, client: TestClient) -> None:
        created = client.post("/api/tasks", json={"title": "A"}).json()

        response = client.delete(f"/api/tasks/{created['id']}")

        assert response.status_code == 204
        assert response.content == b""

    def test_delete_unknown_id_returns_404(self, client: TestClient) -> None:
        response = client.delete("/api/tasks/unknown-id")
        assert response.status_code == 404


class TestPersistenceAndOrdering:
    def test_created_tasks_persist_in_creation_order_across_separate_gets(
        self, client: TestClient
    ) -> None:
        created = [
            client.post("/api/tasks", json={"title": f"task-{i}"}).json() for i in range(5)
        ]
        created_ids = [t["id"] for t in created]

        first_get = client.get("/api/tasks").json()
        second_get = client.get("/api/tasks").json()

        assert [t["id"] for t in first_get] == created_ids
        assert [t["id"] for t in second_get] == created_ids
        assert first_get == second_get


class TestNotFoundBody:
    def test_unknown_task_id_404_has_json_content_type_and_detail_key(
        self, client: TestClient
    ) -> None:
        response = client.delete("/api/tasks/unknown-id")

        assert response.status_code == 404
        assert response.headers["content-type"].startswith("application/json")
        assert "detail" in response.json()

    def test_unknown_route_404_has_json_content_type_and_detail_key(
        self, client: TestClient
    ) -> None:
        response = client.get("/api/does-not-exist")

        assert response.status_code == 404
        assert response.headers["content-type"].startswith("application/json")
        assert "detail" in response.json()


class TestIdNonReuse:
    def test_id_of_new_task_differs_from_a_deleted_task(self, client: TestClient) -> None:
        first = client.post("/api/tasks", json={"title": "A"}).json()
        client.delete(f"/api/tasks/{first['id']}")

        second = client.post("/api/tasks", json={"title": "B"}).json()

        assert second["id"] != first["id"]


class TestCatchAll500:
    def test_failing_repository_returns_handled_json_500_not_a_raised_exception(
        self, failing_client: TestClient
    ) -> None:
        response = failing_client.get("/api/tasks")

        assert response.status_code == 500
        assert response.headers["content-type"].startswith("application/json")
        assert "detail" in response.json()
