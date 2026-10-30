"""Tests for the in-memory TaskRepository."""

from __future__ import annotations

import ast
import threading
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC
from pathlib import Path

import pytest

from backend.app.errors import TaskNotFoundError
from backend.app.repositories.task_repository import TaskRepository
from backend.app.schemas.task import TaskCreate, TaskUpdate

REPO_MODULE = (
    Path(__file__).resolve().parents[1] / "backend" / "app" / "repositories" / "task_repository.py"
)

FORBIDDEN_IMPORTS = {
    "sqlite3",
    "sqlalchemy",
    "psycopg2",
    "pymongo",
    "redis",
    "shelve",
    "pickle",
    "tinydb",
    "os",
}


@pytest.fixture
def repo() -> TaskRepository:
    return TaskRepository()


def test_create_returns_task_with_uuid_id_and_utc_created_at(repo: TaskRepository):
    task = repo.create(TaskCreate(title="A"))

    assert task.id
    assert uuid.UUID(task.id)  # parses as a valid UUID
    assert task.created_at.tzinfo is not None
    assert task.created_at.astimezone(UTC).utcoffset().total_seconds() == 0


def test_list_returns_tasks_in_creation_order(repo: TaskRepository):
    repo.create(TaskCreate(title="A"))
    repo.create(TaskCreate(title="B"))
    repo.create(TaskCreate(title="C"))

    assert [t.title for t in repo.list()] == ["A", "B", "C"]


def test_update_returns_updated_task_and_preserves_order(repo: TaskRepository):
    repo.create(TaskCreate(title="A"))
    b = repo.create(TaskCreate(title="B"))
    repo.create(TaskCreate(title="C"))

    updated = repo.update(b.id, TaskUpdate(title="B2"))

    assert updated.title == "B2"
    assert [t.title for t in repo.list()] == ["A", "B2", "C"]


def test_partial_update_leaves_unset_fields_unchanged(repo: TaskRepository):
    task = repo.create(TaskCreate(title="A", description="desc"))

    updated = repo.update(task.id, TaskUpdate(title="A2"))

    assert updated.title == "A2"
    assert updated.description == "desc"


def test_delete_preserves_relative_order_of_remaining_tasks(repo: TaskRepository):
    a = repo.create(TaskCreate(title="A"))
    b = repo.create(TaskCreate(title="B"))
    c = repo.create(TaskCreate(title="C"))

    repo.delete(b.id)

    assert [t.id for t in repo.list()] == [a.id, c.id]
    assert [t.title for t in repo.list()] == ["A", "C"]


def test_id_not_reused_after_create_then_delete(repo: TaskRepository):
    issued_ids = set()
    for _ in range(5):
        task = repo.create(TaskCreate(title="A"))
        issued_ids.add(task.id)
        repo.delete(task.id)

    next_task = repo.create(TaskCreate(title="final"))

    assert next_task.id not in issued_ids


def test_1000_created_tasks_have_1000_distinct_ids(repo: TaskRepository):
    ids = {repo.create(TaskCreate(title="task")).id for _ in range(1000)}

    assert len(ids) == 1000


@pytest.mark.parametrize(
    "operation",
    [
        lambda repo, task_id: repo.get(task_id),
        lambda repo, task_id: repo.update(task_id, TaskUpdate(title="x")),
        lambda repo, task_id: repo.delete(task_id),
    ],
)
def test_unknown_id_raises_task_not_found_error(repo: TaskRepository, operation):
    with pytest.raises(TaskNotFoundError):
        operation(repo, "does-not-exist")


def test_delete_of_already_deleted_id_raises_task_not_found_error(repo: TaskRepository):
    task = repo.create(TaskCreate(title="A"))
    repo.delete(task.id)

    with pytest.raises(TaskNotFoundError):
        repo.delete(task.id)


def test_concurrent_creation_from_multiple_threads_yields_unique_tasks(repo: TaskRepository):
    thread_count = 8
    creates_per_thread = 100
    barrier = threading.Barrier(thread_count)
    errors: list[BaseException] = []
    errors_lock = threading.Lock()

    def worker():
        barrier.wait()
        try:
            for _ in range(creates_per_thread):
                repo.create(TaskCreate(title="concurrent"))
        except BaseException as exc:  # noqa: BLE001 - surface to the test thread
            with errors_lock:
                errors.append(exc)

    with ThreadPoolExecutor(max_workers=thread_count) as pool:
        futures = [pool.submit(worker) for _ in range(thread_count)]
        for future in futures:
            future.result()

    assert errors == []
    tasks = repo.list()
    assert len(tasks) == thread_count * creates_per_thread
    assert len({t.id for t in tasks}) == thread_count * creates_per_thread


def test_repository_module_imports_no_database_driver_or_file_io():
    source = REPO_MODULE.read_text()
    tree = ast.parse(source)

    imported_modules = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                imported_modules.add(alias.name.split(".")[0])
        elif isinstance(node, ast.ImportFrom) and node.module:
            imported_modules.add(node.module.split(".")[0])

    assert imported_modules.isdisjoint(FORBIDDEN_IMPORTS)

    for node in ast.walk(tree):
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Name):
            assert node.func.id != "open"


def test_mutating_returned_task_does_not_change_stored_task(repo: TaskRepository):
    created = repo.create(TaskCreate(title="A"))

    fetched = repo.get(created.id)
    fetched.title = "mutated"

    assert repo.get(created.id).title == "A"
