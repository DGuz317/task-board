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

## Frontend setup

```bash
cd frontend
npm install
npm run dev     # start the Vite dev server
npm run build   # produce frontend/dist/
npm test        # run Vitest (jsdom) once and exit
```

The frontend defaults to same-origin `/api`. When running Vite and Uvicorn
separately, set `VITE_API_BASE_URL` (see `frontend/.env.example`) to the
backend's base URL including `/api`, e.g. `http://localhost:8000/api`.
All API URLs are built from this single value via `frontend/src/config.js`.

## Vercel deployment

Import this repository as one Vercel project with the project Root Directory
set to the repository root. The root `vercel.json` builds two services:

- `backend`: FastAPI in `backend/`, with `main:app` as its entrypoint.
- `frontend`: the static Vite app in `frontend/`.

Public requests to `/api` and `/api/*` go to the backend without stripping
the prefix. `/docs`, `/docs/*`, `/redoc`, and `/openapi.json` also go to the
backend so its existing documentation works. All remaining paths go to the
frontend. Both services are public; there are no internal-only services.

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

Check `/`, `/api/health` (expect `{"status":"ok"}`), `/docs`, and
`/openapi.json` on the URL printed by the CLI. An unknown `/api/*` path
should return the backend's JSON 404 instead of the frontend HTML.
