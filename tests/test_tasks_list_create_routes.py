"""Contract tests for GET /api/tasks and POST /api/tasks."""

from __future__ import annotations

import ast
from datetime import datetime
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from backend.app.dependencies import get_task_repository
from backend.app.main import create_app
from backend.app.repositories.task_repository import TaskRepository

ROUTER_PATH = Path(__file__).resolve().parents[1] / "backend" / "app" / "routers" / "tasks.py"


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


class TestListEmpty:
    def test_empty_store_returns_200_and_empty_list(self, client):
        response = client.get("/api/tasks")
        assert response.status_code == 200
        assert response.json() == []


class TestCreate:
    def test_create_returns_201_with_full_body(self, client):
        response = client.post("/api/tasks", json={"title": "A", "description": "d"})
        assert response.status_code == 201
        body = response.json()
        assert body["title"] == "A"
        assert body["description"] == "d"
        assert "id" in body and body["id"]
        # created_at must be a parseable timestamp.
        datetime.fromisoformat(body["created_at"])

    def test_created_task_is_retrievable_via_list(self, client):
        created = client.post("/api/tasks", json={"title": "A"}).json()
        listed = client.get("/api/tasks").json()
        assert [t["id"] for t in listed] == [created["id"]]

    @pytest.mark.parametrize("title", ["", "   ", "\t\n", "a" * 101])
    def test_invalid_title_returns_422(self, client, title):
        response = client.post("/api/tasks", json={"title": title})
        assert response.status_code == 422

    def test_missing_title_returns_422(self, client):
        response = client.post("/api/tasks", json={"description": "d"})
        assert response.status_code == 422

    def test_boundary_100_char_title_returns_201(self, client):
        response = client.post("/api/tasks", json={"title": "a" * 100})
        assert response.status_code == 201


class TestListOrdering:
    def test_three_tasks_listed_in_creation_order(self, client):
        created = [client.post("/api/tasks", json={"title": f"task-{i}"}).json() for i in range(3)]

        listed = client.get("/api/tasks").json()

        assert [t["id"] for t in listed] == [t["id"] for t in created]
        timestamps = [datetime.fromisoformat(t["created_at"]) for t in listed]
        assert timestamps == sorted(timestamps)


class TestImportBoundary:
    def test_router_imports_no_concrete_repository_class(self):
        tree = ast.parse(ROUTER_PATH.read_text())
        imported_names: set[str] = set()
        for node in ast.walk(tree):
            if isinstance(node, ast.ImportFrom):
                imported_names.update(alias.name for alias in node.names)
            elif isinstance(node, ast.Import):
                imported_names.update(alias.name for alias in node.names)

        assert "TaskRepository" not in imported_names
        assert "InMemoryTaskRepository" not in imported_names
        assert "get_task_repository" in imported_names

    def test_router_does_not_instantiate_a_repository(self):
        source = ROUTER_PATH.read_text()
        assert "TaskRepository()" not in source


class TestAppWiring:
    def test_task_routes_are_registered_under_api_prefix(self):
        with TestClient(create_app()) as test_client:
            schema = test_client.get("/api/openapi.json").json()
        assert "/api/tasks" in schema["paths"]
        assert "get" in schema["paths"]["/api/tasks"]
        assert "post" in schema["paths"]["/api/tasks"]
