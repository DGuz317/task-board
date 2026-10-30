"""Contract tests for the shared {"detail": ...} error envelope.

Exercises the handlers registered by `register_exception_handlers` inside
`create_app()` via throwaway routes attached to a freshly built app, so
production routers stay untouched.
"""

from __future__ import annotations

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.app.errors import TaskNotFoundError
from backend.app.main import create_app


@pytest.fixture
def app() -> FastAPI:
    return create_app()


def test_task_not_found_returns_404_with_string_detail(app: FastAPI) -> None:
    @app.get("/api/_test-not-found")
    def _raise_not_found() -> None:
        raise TaskNotFoundError("missing-id")

    client = TestClient(app, raise_server_exceptions=False)
    response = client.get("/api/_test-not-found")

    assert response.status_code == 404
    assert response.headers["content-type"].startswith("application/json")
    body = response.json()
    assert isinstance(body["detail"], str)
    assert set(body) == {"detail"}


def test_validation_error_returns_422_with_detail_key(app: FastAPI) -> None:
    @app.get("/api/_test-validation")
    def _needs_int(count: int) -> dict[str, int]:
        return {"count": count}

    client = TestClient(app, raise_server_exceptions=False)
    response = client.get("/api/_test-validation", params={"count": "not-an-int"})

    assert response.status_code == 422
    body = response.json()
    assert "detail" in body
    assert set(body) == {"detail"}


def test_unexpected_exception_returns_500_without_raising_or_leaking(app: FastAPI) -> None:
    @app.get("/api/_test-boom")
    def _boom() -> None:
        raise RuntimeError("boom secret internal stack trace detail")

    client = TestClient(app, raise_server_exceptions=False)
    response = client.get("/api/_test-boom")

    assert response.status_code == 500
    body = response.json()
    assert "detail" in body
    assert isinstance(body["detail"], str)
    assert "boom secret" not in response.text
    assert "Traceback" not in response.text


def test_404_and_422_bodies_share_the_same_top_level_key_set(app: FastAPI) -> None:
    @app.get("/api/_test-not-found-2")
    def _raise_not_found() -> None:
        raise TaskNotFoundError("missing-id-2")

    @app.get("/api/_test-validation-2")
    def _needs_int(count: int) -> dict[str, int]:
        return {"count": count}

    client = TestClient(app, raise_server_exceptions=False)

    not_found_body = client.get("/api/_test-not-found-2").json()
    validation_body = client.get(
        "/api/_test-validation-2", params={"count": "not-an-int"}
    ).json()

    assert set(not_found_body) == set(validation_body) == {"detail"}


def _registered_handlers(app: FastAPI) -> dict[type, object]:
    return app.exception_handlers


def test_create_app_registers_handlers_on_each_fresh_instance() -> None:
    from fastapi.exceptions import RequestValidationError
    from starlette.exceptions import HTTPException as StarletteHTTPException

    from backend.app.errors import (
        http_exception_handler,
        task_not_found_exception_handler,
        unhandled_exception_handler,
        validation_exception_handler,
    )

    first = create_app()
    second = create_app()

    assert first is not second
    for app in (first, second):
        handlers = _registered_handlers(app)
        assert handlers.get(StarletteHTTPException) is http_exception_handler
        assert handlers.get(TaskNotFoundError) is task_not_found_exception_handler
        assert handlers.get(RequestValidationError) is validation_exception_handler
        assert handlers.get(Exception) is unhandled_exception_handler
