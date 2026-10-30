# task-board

## Development

Copy the root `.env.example` to `.env` (gitignored; never commit it) and
adjust values if needed, then start each service with its single command
from the repo root:

```bash
cp .env.example .env
npm run dev:backend   # uvicorn, reload, http://localhost:8000
npm run dev:frontend  # Vite dev server, http://localhost:5173
```

- Backend health check: `GET http://localhost:8000/api/health` -> `200`.
- Frontend app shell: `http://localhost:5173`.

Both scripts fall back to `.env.example`'s placeholder values when no `.env`
is present, so they also work unconfigured.

### VITE_API_BASE_URL contract

`VITE_API_BASE_URL` is the single source of truth for where the frontend
sends API requests. It is an absolute URL **including** the `/api` prefix
and with **no trailing slash**, e.g. `http://localhost:8000/api`. The
frontend builds every request as `${VITE_API_BASE_URL}/<resource>` (for
example `/tasks` resolves to `http://localhost:8000/api/tasks`) and never
re-adds or strips the `/api` prefix itself. `VITE_API_URL` is not used
anywhere in this repo — only `VITE_API_BASE_URL`.

With both dev commands running and `.env.example`'s values applied, the
backend's CORS allowlist (driven by `FRONTEND_ORIGIN`) permits requests from
`http://localhost:5173`, so a fetch to `${VITE_API_BASE_URL}/health` from the
frontend origin succeeds.

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

Lint and format-check the backend with:

```bash
cd backend
ruff check .
ruff format --check .
```

Run the dev server with `uvicorn backend.app.main:app --reload`. The API is
mounted under `/api` (e.g. `GET /api/health`); interactive docs are served at
`/api/docs` (Swagger UI) and `/api/redoc` (ReDoc), with the OpenAPI schema at
`/api/openapi.json`.

Set `FRONTEND_ORIGIN` (see `backend/.env.example`) to the origin the Vite dev
server runs on, e.g. `http://localhost:5173`. CORS allows only that exact
origin; leaving it unset disables cross-origin requests (never a wildcard).

## Frontend setup

```bash
cd frontend
npm install
npm run dev     # start the Vite dev server
npm run build   # produce frontend/dist/
npm test        # run Vitest (jsdom) once and exit
npm run lint         # ESLint (flat config, react-hooks rules enabled)
npm run format:check # Prettier --check
npm run format       # Prettier --write
```

The frontend defaults to same-origin `/api`. When running Vite and Uvicorn
separately, set `VITE_API_BASE_URL` (see `frontend/.env.example`) to the
backend's base URL including `/api`, e.g. `http://localhost:8000/api`.
All API URLs are built from this single value via `frontend/src/config.js`.

## End-to-end tests

Playwright specs live in `frontend/e2e/`. `npm run test:e2e` (from
`frontend/`) starts both the backend (uvicorn, on a dedicated port) and the
frontend (Vite dev server, on a dedicated port) automatically via
`playwright.config.js`'s `webServer` entries, so nothing needs to be running
beforehand. Install the browser once per machine:

```bash
cd frontend
npx playwright install --with-deps chromium
npm run test:e2e
```

## Vercel deployment

Import this repository as one Vercel project with the project Root Directory
set to the repository root. The root `vercel.json` builds two services:

- `backend`: FastAPI in `backend/`, with `main:app` as its entrypoint.
- `frontend`: the static Vite app in `frontend/`.

Public requests to `/api` and `/api/*` go to the backend without stripping
the prefix. Documentation lives under the same prefix at `/api/docs` and
`/api/redoc`, with the schema at `/api/openapi.json`. All remaining paths go
to the frontend. Both services are public; there are no internal-only services.

There are no server-to-server calls, so no service bindings are needed.
The frontend runs in the browser and uses the public `/api` route. Bindings
are available only inside server functions at runtime, not in browser code
or Vite builds. If a server-side caller is added later, declare its binding
on that calling service and read the injected URL at runtime; never set the
binding variable manually.

Leave `VITE_API_BASE_URL` unset in Vercel so preview and production deployments
use their own origin. It is a build-time override for separate-host setups,
not a binding variable. `FRONTEND_ORIGIN` is unnecessary for same-origin
requests; set it only when permitting a separate frontend origin.

After installing backend and frontend dependencies and a current Vercel CLI,
run all services together from the repository root:

```bash
vercel dev
```

Check `/`, `/api/health` (expect `{"status":"ok"}`), `/api/docs`, `/api/redoc`,
and `/api/openapi.json` on the URL printed by the CLI. An unknown `/api/*` path
should return the backend's JSON 404 instead of the frontend HTML.
