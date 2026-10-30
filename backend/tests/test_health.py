"""Smoke tests for the health endpoint, docs, and OpenAPI schema."""

import pytest

from backend.app.main import create_app


def test_health_endpoint_returns_ok(client_factory):
    response = client_factory().get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_docs_available(client_factory):
    response = client_factory().get("/api/docs")
    assert response.status_code == 200
    assert "url: '/api/openapi.json'" in response.text
    assert "/api/docs/oauth2-redirect" in response.text


def test_redoc_available(client_factory):
    response = client_factory().get("/api/redoc")
    assert response.status_code == 200
    assert 'spec-url="/api/openapi.json"' in response.text


def test_docs_oauth_callback_available(client_factory):
    assert client_factory().get("/api/docs/oauth2-redirect").status_code == 200


@pytest.mark.parametrize("path", ["/docs", "/docs/oauth2-redirect", "/redoc", "/openapi.json"])
def test_documentation_only_available_under_api(client_factory, path):
    assert client_factory().get(path).status_code == 404


def test_openapi_lists_health_path(client_factory):
    response = client_factory().get("/api/openapi.json")
    assert response.status_code == 200
    schema = response.json()
    assert "/api/health" in schema["paths"]


def test_create_app_returns_fastapi_instance():
    app = create_app()
    assert type(app).__name__ == "FastAPI"
