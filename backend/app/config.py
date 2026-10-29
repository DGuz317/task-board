"""Application configuration read from environment variables at call time."""

from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    """Runtime settings. `frontend_origin` is `None` when unset or blank."""

    frontend_origin: str | None


def get_settings() -> Settings:
    """Build Settings from the current environment.

    Read lazily (not cached) so tests can monkeypatch the environment and
    get a fresh app via `create_app()` without import-time caching getting
    in the way.
    """
    raw = os.environ.get("FRONTEND_ORIGIN", "")
    origin = raw.strip().rstrip("/")
    return Settings(frontend_origin=origin or None)
