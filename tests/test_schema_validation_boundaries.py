"""Boundary tests for TaskCreate/TaskUpdate title and description validation.

Complements backend/tests/test_task_schemas.py by parametrizing the exact
length boundaries and whitespace-trimming behavior across both input models.
"""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from backend.app.schemas.task import TaskCreate, TaskUpdate

INPUT_MODELS = [TaskCreate, TaskUpdate]


@pytest.mark.parametrize("model", INPUT_MODELS)
class TestTitleLengthBoundaries:
    @pytest.mark.parametrize("length", [1, 100])
    def test_title_at_or_below_max_length_is_valid(self, model, length):
        title = "a" * length
        instance = model.model_validate({"title": title})
        assert instance.title == title

    def test_title_over_max_length_raises(self, model):
        with pytest.raises(ValidationError) as exc_info:
            model.model_validate({"title": "a" * 101})
        assert any(err["loc"] == ("title",) for err in exc_info.value.errors())

    @pytest.mark.parametrize("title", ["   ", "\t\n"])
    def test_whitespace_only_title_raises(self, model, title):
        with pytest.raises(ValidationError) as exc_info:
            model.model_validate({"title": title})
        assert any(err["loc"] == ("title",) for err in exc_info.value.errors())

    def test_padded_title_is_trimmed(self, model):
        instance = model.model_validate({"title": "  hello  "})
        assert instance.title == "hello"

    def test_100_char_title_with_surrounding_spaces_is_valid_and_trimmed(self, model):
        title = " " + ("a" * 100) + " "
        instance = model.model_validate({"title": title})
        assert instance.title == "a" * 100
        assert len(instance.title) == 100

    def test_101_char_title_with_surrounding_spaces_still_raises(self, model):
        title = " " + ("a" * 101) + " "
        with pytest.raises(ValidationError) as exc_info:
            model.model_validate({"title": title})
        assert any(err["loc"] == ("title",) for err in exc_info.value.errors())


@pytest.mark.parametrize("model", INPUT_MODELS)
class TestDescriptionLengthBoundaries:
    @pytest.mark.parametrize("length", [0, 500])
    def test_description_at_or_below_max_length_is_valid(self, model, length):
        description = "a" * length
        instance = model.model_validate(
            {"title": "valid title", "description": description}
        )
        assert instance.description == description

    def test_description_over_max_length_raises(self, model):
        with pytest.raises(ValidationError) as exc_info:
            model.model_validate({"title": "valid title", "description": "a" * 501})
        assert any(err["loc"] == ("description",) for err in exc_info.value.errors())
