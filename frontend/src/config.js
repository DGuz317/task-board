// Single shared frontend-to-backend wiring contract. All API calls build
// URLs as `${API_BASE_URL}/<resource>` — never hard-code the backend host
// or re-add the /api prefix elsewhere.
const DEFAULT_API_BASE_URL = "http://localhost:8000/api";

export function normalizeBaseUrl(raw) {
  const trimmed = (raw || "").trim();
  if (!trimmed) {
    return DEFAULT_API_BASE_URL;
  }
  return trimmed.replace(/\/+$/, "");
}

export const API_BASE_URL = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL);
