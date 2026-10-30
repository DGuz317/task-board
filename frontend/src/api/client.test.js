import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("request", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("GETs {base}/tasks with no Content-Type header when there is no body", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "http://localhost:8000/api");
    fetch.mockResolvedValue(jsonResponse([]));
    const { request } = await import("./client.js");

    await request("/tasks");

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/tasks",
      expect.objectContaining({ headers: undefined, body: undefined }),
    );
  });

  it("sends a JSON body and Content-Type when a body is given", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "http://localhost:8000/api");
    fetch.mockResolvedValue(jsonResponse({ id: "1" }));
    const { request } = await import("./client.js");

    await request("/tasks", { method: "POST", body: { title: "A" } });

    const [, init] = fetch.mock.calls[0];
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ title: "A" }));
    expect(init.headers["Content-Type"]).toBe("application/json");
  });

  it("returns undefined for a 204 response without calling response.json", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "http://localhost:8000/api");
    const res = new Response(null, { status: 204 });
    const jsonSpy = vi.spyOn(res, "json");
    fetch.mockResolvedValue(res);
    const { request } = await import("./client.js");

    const result = await request("/tasks/3", { method: "DELETE" });

    expect(result).toBeUndefined();
    expect(jsonSpy).not.toHaveBeenCalled();
  });

  it("rejects with an ApiError carrying status and the detail message on a 404", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "http://localhost:8000/api");
    fetch.mockImplementation(() =>
      Promise.resolve(jsonResponse({ detail: "Task not found" }, 404)),
    );
    const { request, ApiError } = await import("./client.js");

    const error = await request("/tasks/missing").catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(404);
    expect(error.message).toContain("Task not found");
  });

  it("joins a FastAPI 422 detail array into the error message", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "http://localhost:8000/api");
    fetch.mockResolvedValue(
      jsonResponse(
        { detail: [{ msg: "field required" }, { msg: "too long" }] },
        422,
      ),
    );
    const { request } = await import("./client.js");

    await expect(request("/tasks")).rejects.toMatchObject({
      status: 422,
      message: expect.stringContaining("field required"),
    });
  });

  it("falls back to a status-based message for a non-JSON error body", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "http://localhost:8000/api");
    fetch.mockResolvedValue(
      new Response("not json", { status: 500, statusText: "Server Error" }),
    );
    const { request } = await import("./client.js");

    await expect(request("/tasks")).rejects.toMatchObject({
      status: 500,
      message: expect.stringContaining("500"),
    });
  });

  it("wraps a network failure in an ApiError with status 0", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "http://localhost:8000/api");
    fetch.mockRejectedValue(new Error("network down"));
    const { request, ApiError } = await import("./client.js");

    await expect(request("/tasks")).rejects.toBeInstanceOf(ApiError);
    await expect(request("/tasks")).rejects.toMatchObject({ status: 0 });
  });

  it("does not double the slash when the base URL has a trailing slash", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "http://localhost:8000/api/");
    fetch.mockResolvedValue(jsonResponse([]));
    const { request } = await import("./client.js");

    await request("/tasks");

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/tasks",
      expect.anything(),
    );
  });

  it("requests /api/tasks when VITE_API_BASE_URL is unset", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "");
    fetch.mockResolvedValue(jsonResponse([]));
    const { request } = await import("./client.js");

    await request("/tasks");

    expect(fetch).toHaveBeenCalledWith("/api/tasks", expect.anything());
  });
});
