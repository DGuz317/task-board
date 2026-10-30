"""Task list and create routes.

Storage is reached only through the `get_task_repository` dependency
provider; this module must never import a concrete repository class.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, status

from ..dependencies import get_task_repository
from ..schemas.task import Task, TaskCreate

router = APIRouter(prefix="/tasks", tags=["tasks"])

TaskRepositoryDep = Annotated[object, Depends(get_task_repository)]


@router.get("", response_model=list[Task], status_code=status.HTTP_200_OK)
def list_tasks(repo: TaskRepositoryDep) -> list[Task]:
    """Return all tasks ordered by `created_at` ascending (creation order)."""
    return sorted(repo.list(), key=lambda task: task.created_at)


@router.post("", response_model=Task, status_code=status.HTTP_201_CREATED)
def create_task(data: TaskCreate, repo: TaskRepositoryDep) -> Task:
    """Create a task and return it, including the server-generated id and created_at."""
    return repo.create(data)
