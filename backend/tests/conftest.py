"""Shared fixtures for backend app-factory tests."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from backend.app.main import create_app


@pytest.fixture
def client_factory():
    """Build a TestClient wrapping a freshly created app, so it picks up
    whatever environment variables are set at call time (post-monkeypatch)."""

    def _factory() -> TestClient:
        return TestClient(create_app())

    return _factory
