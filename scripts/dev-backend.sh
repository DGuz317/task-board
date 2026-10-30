#!/usr/bin/env bash
# Single command to start the backend: FastAPI via uvicorn with reload, on
# port 8000. Loads .env if present, otherwise falls back to .env.example's
# placeholder values so the server has FRONTEND_ORIGIN/SQLITE_PATH set.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

if [ -f "$REPO_ROOT/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$REPO_ROOT/.env"
  set +a
elif [ -f "$REPO_ROOT/.env.example" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$REPO_ROOT/.env.example"
  set +a
fi

cd "$REPO_ROOT/backend"
exec python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
