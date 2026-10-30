// Shared constants for playwright.config.js and the e2e specs. Importing a
// single module keeps the webServer env and the spec assertions from
// drifting apart.
export const FRONTEND_PORT = 5273;
export const BACKEND_PORT = 8100;

export const FRONTEND_URL = `http://localhost:${FRONTEND_PORT}`;
export const BACKEND_URL = `http://localhost:${BACKEND_PORT}`;
export const API_BASE_URL = `${BACKEND_URL}/api`;
export const BACKEND_HEALTH_URL = `${API_BASE_URL}/health`;

process.env.VITE_API_BASE_URL = API_BASE_URL;
