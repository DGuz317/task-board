#!/usr/bin/env bash
# Single command to start the frontend: Vite dev server on port 5173 with
# --strictPort, so the served origin always matches FRONTEND_ORIGIN. Loads
# .env if present, otherwise falls back to .env.example's placeholder values.
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

cd "$REPO_ROOT/frontend"
exec npm run dev -- --port 5173 --strictPort
