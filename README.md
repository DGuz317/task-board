# task-board

## Layout

- `backend/` — FastAPI app (`main.py`), `db.py`, `models.py`, `tests/`
- `frontend/src/` — React + Vite sources (scaffold to come)

## Backend setup

```bash
python3.11 -m venv .venv
. .venv/bin/activate
pip install -r backend/requirements.txt
python -m pytest
```

Run the dev server with `uvicorn backend.app.main:app --reload`. The API is
mounted under `/api` (e.g. `GET /api/health`); interactive docs are served at
`/docs` and the OpenAPI schema at `/openapi.json`.

Set `FRONTEND_ORIGIN` (see `backend/.env.example`) to the origin the Vite dev
server runs on, e.g. `http://localhost:5173`. CORS allows only that exact
origin; leaving it unset disables cross-origin requests (never a wildcard).
