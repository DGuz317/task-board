"""p95 latency timing tests for the task CRUD endpoints.

Each test times at least `SAMPLES` requests with `time.perf_counter`,
computes the 95th percentile via the nearest-rank method, and asserts it
stays under `P95_BUDGET_MS`. Tagged with the `timing` marker (registered in
pytest.ini) so the suite can be selected/deselected with `-m`.
"""

from __future__ import annotations

import math
import time

import pytest
from fastapi.testclient import TestClient

from backend.app.dependencies import get_task_repository
from backend.app.main import create_app
from backend.app.repositories.task_repository import TaskRepository

pytestmark = pytest.mark.timing

SAMPLES = 50
P95_BUDGET_MS = 200.0


def _p95(samples_ms: list[float]) -> float:
    """Nearest-rank p95 over a list of millisecond durations."""
    ordered = sorted(samples_ms)
    index = math.ceil(0.95 * len(ordered)) - 1
    return ordered[index]


@pytest.fixture
def repo() -> TaskRepository:
    """A fresh, isolated in-memory repository for a single test."""
    return TaskRepository()


@pytest.fixture
def client(repo: TaskRepository):
    """A TestClient wrapping a fresh app whose repository dependency is
    overridden with `repo`, so timing data never leaks across tests."""
    app = create_app()
    app.dependency_overrides[get_task_repository] = lambda: repo
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


class TestGetListTiming:
    def test_get_list_p95_under_budget_with_100_seeded_tasks(
        self, client: TestClient
    ) -> None:
        for i in range(100):
            response = client.post("/api/tasks", json={"title": f"seed-task-{i}"})
            assert response.status_code == 201

        assert len(client.get("/api/tasks").json()) == 100

        client.get("/api/tasks")  # untimed warm-up

        samples_ms: list[float] = []
        for _ in range(SAMPLES):
            start = time.perf_counter()
            response = client.get("/api/tasks")
            samples_ms.append((time.perf_counter() - start) * 1000)
            assert response.status_code == 200

        p95 = _p95(samples_ms)
        assert p95 < P95_BUDGET_MS, (
            f"GET /api/tasks p95 {p95:.2f} ms exceeds {P95_BUDGET_MS:.0f} ms "
            f"budget (n={len(samples_ms)})"
        )


class TestPostCreateTiming:
    def test_post_create_p95_under_budget(self, client: TestClient) -> None:
        client.post("/api/tasks", json={"title": "warm-up"})  # untimed warm-up

        samples_ms: list[float] = []
        for i in range(SAMPLES):
            start = time.perf_counter()
            response = client.post("/api/tasks", json={"title": f"timed-task-{i}"})
            samples_ms.append((time.perf_counter() - start) * 1000)
            assert response.status_code == 201

        p95 = _p95(samples_ms)
        assert p95 < P95_BUDGET_MS, (
            f"POST /api/tasks p95 {p95:.2f} ms exceeds {P95_BUDGET_MS:.0f} ms "
            f"budget (n={len(samples_ms)})"
        )


class TestPutUpdateTiming:
    def test_put_update_p95_under_budget(self, client: TestClient) -> None:
        created = client.post("/api/tasks", json={"title": "original"}).json()
        task_id = created["id"]

        client.put(f"/api/tasks/{task_id}", json={"title": "warm-up"})  # untimed

        samples_ms: list[float] = []
        for i in range(SAMPLES):
            start = time.perf_counter()
            response = client.put(
                f"/api/tasks/{task_id}", json={"title": f"updated-{i}"}
            )
            samples_ms.append((time.perf_counter() - start) * 1000)
            assert response.status_code == 200

        p95 = _p95(samples_ms)
        assert p95 < P95_BUDGET_MS, (
            f"PUT /api/tasks/{{id}} p95 {p95:.2f} ms exceeds {P95_BUDGET_MS:.0f} ms "
            f"budget (n={len(samples_ms)})"
        )


class TestDeleteTiming:
    def test_delete_p95_under_budget(self, client: TestClient) -> None:
        warm_up_id = client.post("/api/tasks", json={"title": "warm-up"}).json()["id"]
        client.delete(f"/api/tasks/{warm_up_id}")  # untimed warm-up

        task_ids = [
            client.post("/api/tasks", json={"title": f"to-delete-{i}"}).json()["id"]
            for i in range(SAMPLES)
        ]

        samples_ms: list[float] = []
        for task_id in task_ids:
            start = time.perf_counter()
            response = client.delete(f"/api/tasks/{task_id}")
            samples_ms.append((time.perf_counter() - start) * 1000)
            assert response.status_code == 204

        p95 = _p95(samples_ms)
        assert p95 < P95_BUDGET_MS, (
            f"DELETE /api/tasks/{{id}} p95 {p95:.2f} ms exceeds {P95_BUDGET_MS:.0f} ms "
            f"budget (n={len(samples_ms)})"
        )
