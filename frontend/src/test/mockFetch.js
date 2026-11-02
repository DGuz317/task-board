// Shared fetch mock for tests that exercise the real API client (api/client.js)
// instead of mocking api/tasks.js directly. Matches on the URL suffix so it
// keeps working regardless of VITE_API_BASE_URL.
import { vi } from "vitest";

export function jsonResponse(body, status = 200) {
  return new Response(body === undefined ? "" : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function getMethod(init) {
  return init?.method ?? "GET";
}

export function createFetchMock({
  listResponse = [],
  createdTask,
  createStatus = 201,
} = {}) {
  return vi.fn((url, init) => {
    const method = getMethod(init);
    const href = String(url);

    if (method === "GET" && href.endsWith("/tasks")) {
      return Promise.resolve(jsonResponse(listResponse));
    }
    if (method === "POST" && href.endsWith("/tasks")) {
      return Promise.resolve(jsonResponse(createdTask, createStatus));
    }
    return Promise.reject(new Error(`unexpected ${method} request to ${href}`));
  });
}

export function postCalls(fetchMock) {
  return fetchMock.mock.calls.filter(([, init]) => getMethod(init) === "POST");
}
