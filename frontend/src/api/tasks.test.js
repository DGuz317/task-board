import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("tasks API", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    vi.stubEnv("VITE_API_BASE_URL", "http://localhost:8000/api");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("listTasks() GETs exactly {base}/tasks and resolves to the server order, unsorted", async () => {
    const serverOrder = [
      {
        id: "c",
        title: "third",
        description: "",
        created_at: "2024-01-03T00:00:00Z",
      },
      {
        id: "a",
        title: "first",
        description: "",
        created_at: "2024-01-01T00:00:00Z",
      },
      {
        id: "b",
        title: "second",
        description: "",
        created_at: "2024-01-02T00:00:00Z",
      },
    ];
    fetch.mockResolvedValue(jsonResponse(serverOrder));
    const { listTasks } = await import("./tasks.js");

    const result = await listTasks();

    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("http://localhost:8000/api/tasks");
    expect(init.method).toBeUndefined();
    expect(result).toEqual(serverOrder);
  });

  it("createTask POSTs a JSON body with Content-Type and resolves to the created Task", async () => {
    const created = {
      id: "1",
      title: "A",
      description: "",
      created_at: "2024-01-01T00:00:00Z",
    };
    fetch.mockResolvedValue(jsonResponse(created, 201));
    const { createTask } = await import("./tasks.js");

    const result = await createTask({ title: "A" });

    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("http://localhost:8000/api/tasks");
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ title: "A" }));
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(result).toEqual(created);
  });

  it("updateTask(3, ...) PUTs to {base}/tasks/3 and resolves to the updated Task", async () => {
    const updated = {
      id: "3",
      title: "B",
      description: "C",
      created_at: "2024-01-01T00:00:00Z",
    };
    fetch.mockResolvedValue(jsonResponse(updated));
    const { updateTask } = await import("./tasks.js");

    const result = await updateTask(3, { title: "B", description: "C" });

    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("http://localhost:8000/api/tasks/3");
    expect(init.method).toBe("PUT");
    expect(init.body).toBe(JSON.stringify({ title: "B", description: "C" }));
    expect(result).toEqual(updated);
  });

  it("deleteTask(3) DELETEs {base}/tasks/3 and resolves without throwing on a bodyless 204", async () => {
    fetch.mockResolvedValue(new Response(null, { status: 204 }));
    const { deleteTask } = await import("./tasks.js");

    const result = await deleteTask(3);

    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("http://localhost:8000/api/tasks/3");
    expect(init.method).toBe("DELETE");
    expect(result).toBeUndefined();
  });

  it("rejects with an ApiError (status 404, message containing the detail) for an unknown id", async () => {
    fetch.mockResolvedValue(jsonResponse({ detail: "Task not found" }, 404));
    const { deleteTask } = await import("./tasks.js");
    const { ApiError } = await import("./client.js");

    const error = await deleteTask("missing").catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(404);
    expect(error.message).toContain("Task not found");
  });
});
