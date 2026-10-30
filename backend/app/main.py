"""FastAPI application factory.

This is the single mount point for the API: feature routers (e.g. a future
/api/tasks router) must be included on the `/api` APIRouter created here, and
CORSMiddleware must only ever be registered in this module.
"""

from __future__ import annotations

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import Settings, get_settings
from .errors import register_exception_handlers
from .routers.health import router as health_router


def create_app(settings: Settings | None = None) -> FastAPI:
    """Build and configure the FastAPI application."""
    settings = settings if settings is not None else get_settings()

    app = FastAPI(
        title="task-board",
        version="0.1.0",
        docs_url="/api/docs",
        redoc_url="/api/redoc",
        openapi_url="/api/openapi.json",
        swagger_ui_oauth2_redirect_url="/api/docs/oauth2-redirect",
    )

    register_exception_handlers(app)

    api_router = APIRouter(prefix="/api")
    api_router.include_router(health_router)
    app.include_router(api_router)

    allowed_origins = [settings.frontend_origin] if settings.frontend_origin else []
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type"],
    )

    return app


app = create_app()
