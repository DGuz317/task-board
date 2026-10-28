"""Database placeholder: no connection is made at import time."""

import os
import sqlite3

DB_PATH = os.environ.get("TASKBOARD_DB_PATH", "taskboard.sqlite")


def get_connection() -> sqlite3.Connection:
    """Open a new SQLite connection to DB_PATH (lazy; call only when needed)."""
    return sqlite3.connect(DB_PATH)
