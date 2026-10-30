"""Task list and create routes.

Storage is reached only through the `get_task_repository` dependency
provider; this module must never import a concrete repository class.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Response, status

from ..dependencies import get_task_repository
from ..schemas.task import Task, TaskCreate, TaskUpdate

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


@router.put("/{task_id}", response_model=Task, status_code=status.HTTP_200_OK)
def update_task(task_id: str, data: TaskUpdate, repo: TaskRepositoryDep) -> Task:
    """Update a task's title/description in place, keeping its id, position,
    and created_at unchanged. Raises `TaskNotFoundError` (-> 404) for an
    unknown id, translated by the shared exception handler."""
    return repo.update(task_id, data)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(task_id: str, repo: TaskRepositoryDep) -> Response:
    """Delete a task without reordering the rest. Raises `TaskNotFoundError`
    (-> 404) for an unknown id, translated by the shared exception handler."""
    repo.delete(task_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
