"""Unit tests for the task repository dependency provider."""

from __future__ import annotations

import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from backend.app.dependencies import get_task_repository, reset_task_repository
from backend.app.main import create_app
from backend.app.repositories.task_repository import TaskRepository
from backend.app.schemas.task import TaskCreate


@pytest.fixture(autouse=True)
def _isolated_repository():
    """Reset the singleton and clear overrides before and after each test."""
    reset_task_repository()
    yield
    reset_task_repository()


def test_get_task_repository_returns_same_instance():
    assert get_task_repository() is get_task_repository()


def test_task_created_via_one_call_is_visible_via_a_later_call():
    repo = get_task_repository()
    created = repo.create(TaskCreate(title="Buy milk"))

    later_repo = get_task_repository()
    ids = [task.id for task in later_repo.list()]

    assert created.id in ids


def test_override_replaces_repository_received_by_route():
    app = FastAPI()

    @app.get("/probe")
    def probe(repo: TaskRepository = Depends(get_task_repository)) -> dict:
        return {"repo_id": id(repo)}

    replacement = TaskRepository()
    app.dependency_overrides[get_task_repository] = lambda: replacement

    try:
        response = TestClient(app).get("/probe")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json() == {"repo_id": id(replacement)}
    assert id(replacement) != id(get_task_repository())


def test_reset_task_repository_yields_empty_list_for_isolation():
    repo = get_task_repository()
    repo.create(TaskCreate(title="Leftover task"))
    assert get_task_repository().list() != []

    reset_task_repository()

    assert get_task_repository().list() == []


def test_fresh_override_yields_empty_list():
    app = FastAPI()

    @app.get("/probe")
    def probe(repo: TaskRepository = Depends(get_task_repository)) -> list:
        return [task.model_dump(mode="json") for task in repo.list()]

    app.dependency_overrides[get_task_repository] = TaskRepository

    try:
        response = TestClient(app).get("/probe")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json() == []


def test_importing_provider_module_does_not_affect_health_endpoint():
    # Importing backend.app.dependencies above must not register routes or
    # touch the FastAPI app; the health endpoint should behave as before.
    client = TestClient(create_app())
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
