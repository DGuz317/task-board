"""Tests for the uniform {"detail": ...} error envelope."""

from fastapi.testclient import TestClient

from backend.app.main import create_app


def test_unknown_path_under_api_returns_404_with_detail(client_factory):
    response = client_factory().get("/api/does-not-exist")
    assert response.status_code == 404
    body = response.json()
    assert "detail" in body


def test_unknown_path_outside_api_returns_404_with_detail(client_factory):
    response = client_factory().get("/does-not-exist-either")
    assert response.status_code == 404
    assert "detail" in response.json()


def test_wrong_method_returns_405_with_detail(client_factory):
    response = client_factory().post("/api/health")
    assert response.status_code == 405
    assert "detail" in response.json()


def test_validation_error_returns_422_with_detail():
    # No existing route takes input, so exercise the shared validation
    # handler via a throwaway route added to a freshly built app.
    app = create_app()

    @app.get("/api/_test-validation")
    def _needs_int(count: int) -> dict[str, int]:
        return {"count": count}

    client = TestClient(app, raise_server_exceptions=False)
    response = client.get("/api/_test-validation", params={"count": "not-an-int"})
    assert response.status_code == 422
    assert "detail" in response.json()


def test_unhandled_exception_returns_500_without_leaking_details():
    app = create_app()

    @app.get("/api/_test-boom")
    def _boom() -> None:
        raise RuntimeError("super secret internal stack detail")

    client = TestClient(app, raise_server_exceptions=False)
    response = client.get("/api/_test-boom")
    assert response.status_code == 500
    body = response.json()
    assert body == {"detail": "Internal Server Error"}
    assert "secret" not in response.text
