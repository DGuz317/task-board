"""Unit tests for Task, TaskCreate and TaskUpdate schemas."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

import pytest
from pydantic import ValidationError

from backend.app.schemas.task import Task, TaskCreate, TaskUpdate


class TestTaskCreateTitle:
    def test_strips_surrounding_whitespace(self):
        assert TaskCreate(title="  Buy milk  ").title == "Buy milk"

    @pytest.mark.parametrize("title", ["a", "a" * 100])
    def test_boundary_lengths_are_valid(self, title):
        assert TaskCreate(title=title).title == title

    def test_too_long_title_raises(self):
        with pytest.raises(ValidationError):
            TaskCreate(title="a" * 101)

    @pytest.mark.parametrize("title", ["", "   ", "\t\n"])
    def test_empty_or_whitespace_only_title_raises(self, title):
        with pytest.raises(ValidationError):
            TaskCreate(title=title)

    def test_title_padded_with_whitespace_up_to_100_after_strip_is_valid(self):
        title = "  " + ("a" * 100) + "  "
        assert TaskCreate(title=title).title == "a" * 100


class TestTaskCreateDescription:
    def test_defaults_to_empty_string(self):
        assert TaskCreate(title="x").description == ""

    @pytest.mark.parametrize("description", ["", "a" * 500])
    def test_boundary_lengths_are_valid(self, description):
        assert TaskCreate(title="x", description=description).description == description

    def test_too_long_description_raises(self):
        with pytest.raises(ValidationError):
            TaskCreate(title="x", description="a" * 501)


class TestTaskCreateRejectsServerFields:
    def test_rejects_client_supplied_id(self):
        with pytest.raises(ValidationError):
            TaskCreate(title="x", id="abc")

    def test_rejects_client_supplied_created_at(self):
        with pytest.raises(ValidationError):
            TaskCreate(title="x", created_at="2024-01-01T00:00:00Z")


class TestTaskUpdate:
    def test_no_fields_is_valid_and_defaults_to_none(self):
        update = TaskUpdate()
        assert update.title is None
        assert update.description is None

    def test_strips_surrounding_whitespace(self):
        assert TaskUpdate(title="  Buy milk  ").title == "Buy milk"

    @pytest.mark.parametrize("title", ["a", "a" * 100])
    def test_title_boundary_lengths_are_valid(self, title):
        assert TaskUpdate(title=title).title == title

    def test_title_too_long_raises(self):
        with pytest.raises(ValidationError):
            TaskUpdate(title="a" * 101)

    @pytest.mark.parametrize("title", ["", "   "])
    def test_empty_or_whitespace_only_title_raises(self, title):
        with pytest.raises(ValidationError):
            TaskUpdate(title=title)

    @pytest.mark.parametrize("description", ["", "a" * 500])
    def test_description_boundary_lengths_are_valid(self, description):
        assert TaskUpdate(description=description).description == description

    def test_description_too_long_raises(self):
        with pytest.raises(ValidationError):
            TaskUpdate(description="a" * 501)

    def test_rejects_extra_fields(self):
        with pytest.raises(ValidationError):
            TaskUpdate(title="x", id="abc")


class TestTask:
    def test_id_and_created_at_are_auto_generated(self):
        task = Task(title="x")
        assert uuid.UUID(task.id)
        assert task.created_at.tzinfo is not None

    def test_two_instances_get_different_ids(self):
        assert Task(title="x").id != Task(title="y").id

    def test_model_dump_json_created_at_is_iso8601_utc_string(self):
        dumped = Task(title="x").model_dump(mode="json")
        created_at = dumped["created_at"]
        assert isinstance(created_at, str)
        assert created_at.endswith("Z") or created_at.endswith("+00:00")
        datetime.fromisoformat(created_at.replace("Z", "+00:00"))

    def test_naive_datetime_is_rejected(self):
        with pytest.raises(ValidationError):
            Task(title="x", created_at=datetime(2024, 1, 1))

    def test_non_utc_aware_datetime_is_normalized_to_utc(self):
        offset = timezone(timedelta(hours=5))
        aware = datetime(2024, 1, 1, 12, 0, 0, tzinfo=offset)
        task = Task(title="x", created_at=aware)
        assert task.created_at.utcoffset() == timedelta(0)
        assert task.created_at == aware

    def test_applies_shared_title_and_description_validation(self):
        with pytest.raises(ValidationError):
            Task(title="")
        with pytest.raises(ValidationError):
            Task(title="x", description="a" * 501)
