"""FastAPI application entrypoint (re-exports the app factory)."""

if __package__:
    from .app.main import app, create_app
else:
    # Vercel imports main from the backend service root.
    from app.main import app, create_app

__all__ = ["app", "create_app"]
