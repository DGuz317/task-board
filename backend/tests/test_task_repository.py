"""Unit tests for TaskRepository ordering, id uniqueness, update/delete
semantics, unknown-id errors, scale, and thread-safety."""

from __future__ import annotations

import time
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier

import pytest

from backend.app.errors import TaskNotFoundError
from backend.app.repositories.task_repository import TaskRepository
from backend.app.schemas.task import TaskCreate, TaskUpdate


@pytest.fixture
def repo():
    """A fresh, empty repository instance per test (never the dependency
    provider's cached singleton), so tests never share state."""
    return TaskRepository()


def make_create(title: str, description: str = "") -> TaskCreate:
    return TaskCreate(title=title, description=description)


class TestListOrdering:
    def test_list_returns_ids_in_creation_order(self, repo):
        created = [repo.create(make_create(f"task-{i}")) for i in range(5)]
        assert [t.id for t in repo.list()] == [t.id for t in created]


class TestIdUniquenessAfterDelete:
    def test_deleted_id_never_reappears_and_ids_stay_unique(self, repo):
        first_batch = [repo.create(make_create(f"a-{i}")) for i in range(3)]
        deleted = first_batch[1]
        repo.delete(deleted.id)

        second_batch = [repo.create(make_create(f"b-{i}")) for i in range(3)]
        later_ids = [t.id for t in second_batch]

        assert deleted.id not in later_ids
        all_ids = [t.id for t in first_batch if t.id != deleted.id] + later_ids
        assert len(all_ids) == len(set(all_ids))

    def test_deleted_last_created_id_never_reappears(self, repo):
        batch = [repo.create(make_create(f"c-{i}")) for i in range(3)]
        last = batch[-1]
        repo.delete(last.id)

        more = [repo.create(make_create(f"d-{i}")) for i in range(3)]
        assert last.id not in [t.id for t in more]
        assert len({t.id for t in more}) == len(more)


class TestInPlaceUpdate:
    def test_updating_middle_task_changes_only_title_and_description(self, repo):
        created = [repo.create(make_create(f"t-{i}", f"d-{i}")) for i in range(3)]
        middle = created[1]

        updated = repo.update(middle.id, TaskUpdate(title="new title", description="new desc"))

        listed = repo.list()
        assert [t.id for t in listed] == [t.id for t in created]
        assert listed[1].id == middle.id
        assert updated.title == "new title"
        assert updated.description == "new desc"
        assert updated.id == middle.id
        assert updated.created_at == middle.created_at

        assert listed[0].title == created[0].title
        assert listed[0].description == created[0].description
        assert listed[2].title == created[2].title
        assert listed[2].description == created[2].description


class TestOrderPreservingDelete:
    @pytest.mark.parametrize("delete_index", [0, 2, 4])
    def test_delete_preserves_relative_order_of_survivors(self, repo, delete_index):
        created = [repo.create(make_create(f"t-{i}")) for i in range(5)]
        target = created[delete_index]

        repo.delete(target.id)

        expected_ids = [t.id for t in created if t.id != target.id]
        assert [t.id for t in repo.list()] == expected_ids


class TestUnknownId:
    @pytest.mark.parametrize("op_name", ["get", "update", "delete"])
    def test_operations_on_unissued_id_raise_not_found(self, repo, op_name):
        unknown_id = "never-issued-id"
        self._invoke(repo, op_name, unknown_id)

    @pytest.mark.parametrize("op_name", ["get", "update", "delete"])
    def test_operations_on_deleted_id_raise_not_found(self, repo, op_name):
        task = repo.create(make_create("x"))
        repo.delete(task.id)
        self._invoke(repo, op_name, task.id)

    @staticmethod
    def _invoke(repo, op_name, task_id):
        with pytest.raises(TaskNotFoundError):
            if op_name == "get":
                repo.get(task_id)
            elif op_name == "update":
                repo.update(task_id, TaskUpdate(title="x"))
            else:
                repo.delete(task_id)


class TestScale:
    def test_600_tasks_have_unique_ids_correct_order_and_run_fast(self, repo):
        count = 600
        start = time.perf_counter()
        created = [repo.create(make_create(f"task-{i}")) for i in range(count)]
        elapsed = time.perf_counter() - start

        ids = [t.id for t in created]
        assert len(ids) == count
        assert len(set(ids)) == count
        assert [t.id for t in repo.list()] == ids
        assert elapsed < 2.0


class TestConcurrency:
    def test_concurrent_creates_produce_no_lost_or_duplicate_tasks(self, repo):
        thread_count = 8
        per_thread = 50
        total = thread_count * per_thread
        barrier = Barrier(thread_count)

        def create_batch(worker_index: int) -> list[str]:
            barrier.wait()
            return [repo.create(make_create(f"w{worker_index}-{i}")).id for i in range(per_thread)]

        with ThreadPoolExecutor(max_workers=thread_count) as executor:
            results = list(executor.map(create_batch, range(thread_count)))

        returned_ids = [task_id for batch in results for task_id in batch]
        assert len(returned_ids) == total
        assert len(set(returned_ids)) == total

        listed_ids = [t.id for t in repo.list()]
        assert len(listed_ids) == total
        assert set(listed_ids) == set(returned_ids)
