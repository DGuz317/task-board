"""FastAPI application entrypoint (re-exports the app factory)."""

from backend.app.main import app, create_app

__all__ = ["app", "create_app"]
