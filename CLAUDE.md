# task-board

A monorepo with a FastAPI backend (in-memory task store) and a React 18 + Vite + TypeScript frontend. Read this file fully before implementing any task. Keep changes scoped to the task at hand and match existing code before introducing new patterns.

## Repo Layout

- `backend/` — Python 3.11, FastAPI, Pydantic v2. Routes are mounted under `/api` (task CRUD at `/api/tasks`).
- `frontend/` — React 18, Vite, TypeScript, react-router-dom. Routed app shell (board list, board detail) with an error boundary.
- `e2e/` (or the Playwright config location already in the repo) — Playwright specs, shared fixtures, and page helpers.
- `.github/workflows/` — CI. Add new gates as additive workflows or jobs; do not rewrite existing ones.
- Check the existing directory structure before creating new top-level folders. Do not move files unless the task says so.

## Tech Stack (do not add others)

- Backend: FastAPI (`APIRouter`, exception handlers, dependency injection), Pydantic v2 schemas, pip-managed dependencies, pytest + `TestClient`.
- Storage: an in-memory, insertion-ordered `dict` guarded by `threading.Lock`, with ids from `uuid`. There is no external database and no authentication.
- Frontend: React 18 with hooks only (no class components except where an error boundary requires one), TypeScript, Vite, react-router-dom, plain CSS, and a fetch-based typed API client.
- Testing: pytest (backend and repo-constraint scans), Vitest + React Testing Library (frontend unit/component), Playwright with Chromium (E2E, axe-core accessibility, UI timing), Lighthouse CI.
- Do not introduce an ORM, database driver, auth library, CSS framework, UI component library, state-management library, or a CSS-in-JS solution. Repo-constraint tests scan for DB and auth usage and will fail if they appear.

## Common Commands

Check `package.json`, the dev scripts, and any Makefile for the exact names before running; prefer the existing scripts over ad hoc commands.

- Backend install: `pip install -r backend/requirements.txt` (plus the dev requirements file if one exists)
- Backend run: `uvicorn` against the app factory, with the app served on the port the Vite proxy / Playwright config expects
- Backend tests: `pytest` from the backend directory (or repo root, per existing config)
- Frontend install: `npm install` in `frontend/`
- Frontend dev / build / preview: `npm run dev`, `npm run build`, `npm run preview`
- Frontend tests: `npm test` (Vitest; use run mode, not watch, in non-interactive contexts)
- E2E: `npx playwright test` (the Playwright `webServer` starts the backend and the built frontend via `vite preview`)
- Lint / format: use the configured linters and formatters for both sides; run them before finishing a task.

Before declaring a task done, run the relevant tests and linters for every area you touched, and report failures honestly with their output.

## Backend Conventions

- Use an app factory (`create_app()`) that registers routers, exception handlers, and a health endpoint. Keep routers in `APIRouter` modules; keep `main`/factory wiring thin.
- Pydantic v2 only: use `model_validate`, `model_dump`, `field_validator`, and `ConfigDict`. Do not use v1 APIs (`.dict()`, `@validator`, `class Config`).
- Keep separate schemas for create, update, and read. Validate at the boundary (title required and non-empty after trimming, length limits, `completed` optional boolean defaulting to false).
- Access the repository only through a dependency provider (`Depends(...)`) so tests can override it. Routes never touch the dict or the lock directly.
- The repository must be thread-safe: every read and write of shared state happens under the `threading.Lock`. Return copies or immutable models so callers cannot mutate stored state. Preserve insertion order for listing.
- Errors return a consistent JSON shape through shared exception handlers (404 for unknown id, 422 for validation, with the same envelope). Do not hand-roll error responses per route.
- Use correct status codes: 200 list/get/update, 201 create, 204 (or the existing convention) delete, 404 unknown id.
- Performance budget: API p95 latency is covered by timing tests, so keep handlers synchronous-simple and free of sleeps or heavy work.
- Tests: pytest with `TestClient`. Cover schema boundaries (empty, whitespace, max length, wrong types), repository behavior (ordering, update, delete, missing ids, concurrency), and endpoint contracts. Reset repository state between tests via dependency override or a fresh app per test.

## Frontend Conventions

- TypeScript, function components, and hooks only. Avoid `any`; type API payloads and share types with the API client.
- All network access goes through the typed API client (`listTasks`, `createTask`, `updateTask`, `deleteTask`). Components and hooks never call `fetch` directly. The client throws typed errors on non-2xx responses.
- Reuse shared components: `Modal`, `TaskForm`, `TaskRow`, `TaskList`, the kebab menu, and the `ErrorMessage` banner. Extend them rather than creating parallel versions. `CreateTaskModal`, the edit modal, and the delete confirmation compose `Modal`.
- Form validation lives in a pure, separately testable function used by `TaskForm`. Show errors inline beneath each field.
- State: lists update in place without reload. Mutations use the shared optimistic-update hook with rollback; on failure, roll back, show the error banner, and re-sync from the server. Only one kebab menu is open at a time.
- Keep the empty-state text exact as specified by the task or existing tests. Do not reword user-facing strings that tests assert on.
- The Task Board offers only Edit and Delete in the kebab menu. Double-click on a title enters edit mode; the menu Edit action must remain the accessible alternative.
- The data-reset footer note must stay visible, since data is in memory and resets when the server restarts.
- Tests: Vitest + React Testing Library with mocked `fetch` (or a mocked API client module). Query by role and accessible name, use `userEvent`, and assert on behavior, not implementation details. Cover loading, empty, error, and success states for each feature.

## Design & UI Conventions

Every UI change must follow this visual language. Do not ship unstyled native elements and do not hard-code values that belong to a token.

**Tokens and styling**
- All styling is plain CSS in the existing global stylesheet / co-located CSS files. No CSS frameworks, no inline style objects for anything token-expressible.
- Define and consume design tokens as CSS custom properties on `:root`: color, spacing, typography, radius, border, shadow, and z-index. Reference them with `var(--token)`. Add a new token to the global stylesheet rather than inlining a one-off value.
- Spacing uses a consistent scale (a 4px base: 4, 8, 12, 16, 24, 32, 48). Do not use arbitrary pixel values for margins or padding.

**Color and typography**
- White page background, near-black body text, neutral gray borders and muted text. One accent color (primary actions use `#2563EB` with white text) and one distinct red-toned error color (used for error banners, inline field errors, and the destructive Delete action).
- Use the system font stack. Establish clear hierarchy: bold task title, smaller muted description, consistent type scale and line heights through tokens.
- All text and UI boundaries must meet WCAG AA contrast (4.5:1 for body text, 3:1 for large text and UI components). Muted text and the strikethrough style for completed titles must still pass.

**Layout and components**
- Centered container with a max width of 1100px, with horizontal padding that holds on narrow screens.
- The task list is a single vertical list of flat, card-style rows (semantic `<ul>`/`<li>`) with consistent gaps. Each row has a start-aligned native checkbox, a title/description block, and a reserved right-edge slot for the compact kebab (3-dot) button and its popover menu.
- Modals: centered dialog over a dimmed scrim, stacked form fields with consistent spacing, inline error text beneath each field. Primary button is solid accent; Cancel is a secondary (outlined or neutral) style. The Delete action is visibly distinct (error color) and confirmed through a dialog.
- Feedback elements (spinner, error banner, footer note) render inline within the list and app shell and must not cause layout shifts. The spinner is a lightweight CSS animation; the error banner is red-toned and dismissible; the footer note is muted small print.
- Keep hover, focus, active, and disabled states defined for every interactive element.

**Responsiveness**
- Mobile-first, single-column layout that stays usable down to roughly 320px wide. No horizontal scrolling. Modals fit narrow viewports and scroll internally when needed.

**Accessibility bar (WCAG AA; axe-core critical/serious violations must be zero, Lighthouse Accessibility ≥ 90)**
- Interactive targets are at least 44×44px.
- A visible focus ring on every focusable element (use a token-based `:focus-visible` style; never `outline: none` without a replacement).
- Dialogs: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing to the title, focus trapped inside while open, focus returned to the trigger on close, and Esc closes.
- Kebab menu: `aria-haspopup`, `aria-expanded`, `role="menu"` / `role="menuitem"`, arrow-key navigation, Home/End, Esc to close and return focus to the trigger.
- Validation and async errors are announced: inline field errors via `aria-live` and `aria-describedby`; the error banner uses `role="alert"`; loading uses an accessible status. The dismiss button has an `aria-label`.
- Every control has an accessible name (checkboxes and icon-only buttons use `aria-label`). Use semantic elements (`button`, `ul`, `li`, `label`) before reaching for ARIA.
- Respect `prefers-reduced-motion`: disable or minimize the spinner and any transitions.
- Everything must be fully operable by keyboard alone.

**Performance targets**
- UI updates after create, edit, and delete render in under 500 ms with 100 tasks; initial load completes in under 2 s. Avoid unnecessary re-renders of long lists (stable keys, memoize row callbacks where it helps).

## Testing & Quality Gates

- Write or update tests with every change. Backend: pytest. Frontend: Vitest + RTL. User-facing flows: Playwright.
- Playwright specs share fixtures and page helpers; reuse them rather than duplicating selectors. Prefer role- and label-based locators. Reset backend state between tests through the API (delete all tasks) or a fresh server.
- E2E coverage includes load, create with validation, menu/edit/delete, keyboard-only CRUD, unknown-id 404 API checks, completion toggle, double-click edit, and optimistic rollback.
- Accessibility checks use axe-core in Playwright; UI timing assertions enforce the 500 ms / 2 s budgets.
- Lighthouse CI runs as an additive GitHub Actions job and gates merges. Do not weaken thresholds or remove assertions to make a gate pass; fix the underlying issue.
- Repo-constraint pytest scans enforce no database and no authentication. Do not add dependencies or code that would trip them.
- Never skip, delete, or loosen a failing test to get green unless the task explicitly changes the behavior it covers.

## Workflow Rules

- Make the smallest change that satisfies the task, and keep the diff focused. Do not refactor unrelated code.
- Follow existing naming, file organization, import style, and comment density. Prefer clear code over comments; comment only for non-obvious intent.
- Pin and add dependencies only when the task requires them, using the existing package managers (pip, npm). Do not add a tool that duplicates an existing one.
- Do not commit secrets, `.env` files, build output, `node_modules`, or virtual environments.
- Keep CI workflows additive and fast. Do not change the lint/format baseline settings without being asked.
- If a requirement is ambiguous or conflicts with this file, follow the task's explicit instructions, then keep the rest consistent with this document, and note the assumption in your final summary.
- In your final summary, state what changed, which tests and linters you ran with their results, and anything you skipped or could not verify.
