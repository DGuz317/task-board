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
