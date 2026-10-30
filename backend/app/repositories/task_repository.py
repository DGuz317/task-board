"""Thread-safe in-memory task repository.

Backed by an insertion-ordered dict guarded by a `threading.Lock`. Ids are
server-generated uuid4 strings and are never reused, even after a task is
deleted, so a separate `_issued_ids` set survives past deletion.
"""

from __future__ import annotations

import threading
import uuid
from datetime import UTC, datetime

from ..errors import TaskNotFoundError
from ..schemas.task import Task, TaskCreate, TaskUpdate


class TaskRepository:
    """In-memory, thread-safe store of `Task` records."""

    def __init__(self) -> None:
        self._tasks: dict[str, Task] = {}
        self._issued_ids: set[str] = set()
        self._lock = threading.Lock()

    def list(self) -> list[Task]:
        """Return tasks in insertion (creation) order, oldest first."""
        with self._lock:
            return list(self._tasks.values())

    def get(self, task_id: str) -> Task:
        with self._lock:
            task = self._tasks.get(task_id)
            if task is None:
                raise TaskNotFoundError(task_id)
            return task.model_copy()

    def create(self, data: TaskCreate) -> Task:
        with self._lock:
            new_id = str(uuid.uuid4())
            while new_id in self._issued_ids:
                new_id = str(uuid.uuid4())
            self._issued_ids.add(new_id)

            task = Task(
                **data.model_dump(),
                id=new_id,
                created_at=datetime.now(UTC),
            )
            self._tasks[new_id] = task
            return task.model_copy()

    def update(self, task_id: str, data: TaskUpdate) -> Task:
        with self._lock:
            existing = self._tasks.get(task_id)
            if existing is None:
                raise TaskNotFoundError(task_id)

            updated = existing.model_copy(update=data.model_dump(exclude_unset=True))
            self._tasks[task_id] = updated
            return updated.model_copy()

    def delete(self, task_id: str) -> None:
        with self._lock:
            if task_id not in self._tasks:
                raise TaskNotFoundError(task_id)
            del self._tasks[task_id]
