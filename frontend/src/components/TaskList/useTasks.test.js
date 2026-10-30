import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTasks } from "./useTasks.js";

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("useTasks", () => {
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

  it("fetches tasks exactly once on mount and exposes them", async () => {
    const initial = [{ id: "1", title: "A", description: "", created_at: "t" }];
    fetch.mockResolvedValue(jsonResponse(initial));

    const { result } = renderHook(() => useTasks());

    await waitFor(() => expect(result.current.tasks).toEqual(initial));
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("starts with tasks === null before the first response arrives", () => {
    fetch.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useTasks());

    expect(result.current.tasks).toBeNull();
  });

  it("reload() re-fetches and replaces the displayed tasks", async () => {
    const initial = [{ id: "1", title: "A", description: "", created_at: "t" }];
    const updated = [
      { id: "1", title: "A", description: "", created_at: "t" },
      { id: "2", title: "B", description: "", created_at: "t2" },
    ];
    fetch.mockResolvedValueOnce(jsonResponse(initial));
    fetch.mockResolvedValueOnce(jsonResponse(updated));

    const { result } = renderHook(() => useTasks());
    await waitFor(() => expect(result.current.tasks).toEqual(initial));

    await act(async () => {
      await result.current.reload();
    });

    expect(result.current.tasks).toEqual(updated);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("recovers to fresh data on reload after an initial failure", async () => {
    fetch.mockRejectedValueOnce(new Error("boom"));
    const recovered = [
      { id: "9", title: "Z", description: "", created_at: "t" },
    ];
    fetch.mockResolvedValueOnce(jsonResponse(recovered));

    const { result } = renderHook(() => useTasks());

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    expect(result.current.tasks).toBeNull();

    await act(async () => {
      await result.current.reload();
    });

    expect(result.current.tasks).toEqual(recovered);
  });

  it("keeps a stable reload reference across re-renders", async () => {
    fetch.mockResolvedValue(jsonResponse([]));
    const { result, rerender } = renderHook(() => useTasks());
    await waitFor(() => expect(result.current.tasks).toEqual([]));

    const firstReload = result.current.reload;
    rerender();

    expect(result.current.reload).toBe(firstReload);
  });

  it("discards a stale in-flight response that resolves after a newer reload", async () => {
    let resolveFirst;
    let resolveSecond;
    fetch
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecond = resolve;
          }),
      );

    const { result } = renderHook(() => useTasks());
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));

    let reloadPromise;
    act(() => {
      reloadPromise = result.current.reload();
    });
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));

    const stale = [
      { id: "stale", title: "Stale", description: "", created_at: "t" },
    ];
    const fresh = [
      { id: "fresh", title: "Fresh", description: "", created_at: "t2" },
    ];

    await act(async () => {
      resolveSecond(jsonResponse(fresh));
      await reloadPromise;
    });
    expect(result.current.tasks).toEqual(fresh);

    await act(async () => {
      resolveFirst(jsonResponse(stale));
    });
    expect(result.current.tasks).toEqual(fresh);
  });
});
