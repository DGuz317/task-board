"""FastAPI dependency providers.

Routes depend on these instead of touching storage directly, so tests can
override them (e.g. `app.dependency_overrides[get_task_repository] = ...`).
"""

from __future__ import annotations

from functools import lru_cache

from .repositories.task_repository import TaskRepository


@lru_cache
def get_task_repository() -> TaskRepository:
    """Return the process-wide `TaskRepository` singleton shared by requests."""
    return TaskRepository()


def reset_task_repository() -> None:
    """Discard the cached singleton so the next `get_task_repository()` call
    builds a fresh, empty `TaskRepository`. Intended for test isolation; call
    it via `get_task_repository()` afterwards rather than holding a reference
    to the old instance.
    """
    get_task_repository.cache_clear()
