"""Task schemas: server-stored Task plus client-facing TaskCreate/TaskUpdate.

Title and description share one set of constraints via the Annotated types
below so TaskCreate and TaskUpdate cannot drift apart.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Annotated

from pydantic import (
    AwareDatetime,
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    field_validator,
)

TitleStr = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
DescriptionStr = Annotated[str, StringConstraints(max_length=500)]


class TaskCreate(BaseModel):
    """Client input for creating a task. `id` and `created_at` are server-generated."""

    model_config = ConfigDict(extra="forbid")

    title: TitleStr
    description: DescriptionStr = ""


class TaskUpdate(BaseModel):
    """Partial update: omitted/None fields mean "leave unchanged"."""

    model_config = ConfigDict(extra="forbid")

    title: TitleStr | None = None
    description: DescriptionStr | None = None


class Task(BaseModel):
    """Stored/returned task, with server-generated id and created_at."""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: TitleStr
    description: DescriptionStr = ""
    created_at: AwareDatetime = Field(default_factory=lambda: datetime.now(UTC))

    @field_validator("created_at")
    @classmethod
    def _normalize_to_utc(cls, value: datetime) -> datetime:
        return value.astimezone(UTC)
