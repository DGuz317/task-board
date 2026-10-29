"""Smoke tests for the health endpoint, docs, and OpenAPI schema."""

from backend.app.main import create_app


def test_health_endpoint_returns_ok(client_factory):
    response = client_factory().get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_docs_available(client_factory):
    assert client_factory().get("/docs").status_code == 200


def test_openapi_lists_health_path(client_factory):
    response = client_factory().get("/openapi.json")
    assert response.status_code == 200
    schema = response.json()
    assert "/api/health" in schema["paths"]


def test_create_app_returns_fastapi_instance():
    app = create_app()
    assert type(app).__name__ == "FastAPI"
