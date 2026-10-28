"""Pydantic v2 model placeholders."""

from pydantic import BaseModel, field_validator


class Board(BaseModel):
    id: int
    name: str

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("name must not be blank")
        return value
