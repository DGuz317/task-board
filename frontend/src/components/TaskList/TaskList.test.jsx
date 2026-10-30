import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TaskList from "./TaskList.jsx";

const here = dirname(fileURLToPath(import.meta.url));
const sourceJsx = readFileSync(join(here, "TaskList.jsx"), "utf-8");
const sourceCss = readFileSync(join(here, "TaskList.css"), "utf-8");
const tokensCss = readFileSync(
  join(here, "..", "..", "styles", "tokens.css"),
  "utf-8",
);

const EMPTY_TEXT = "No tasks yet. Click Create to add one.";

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function flushMicrotasks() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

const sampleTasks = [
  {
    id: "a",
    title: "First",
    description: "",
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "b",
    title: "Second",
    description: "desc",
    created_at: "2024-01-02T00:00:00Z",
  },
  {
    id: "c",
    title: "Third",
    description: "",
    created_at: "2024-01-03T00:00:00Z",
  },
];

describe("TaskList", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("calls GET /tasks exactly once on mount", async () => {
    fetch.mockResolvedValue(jsonResponse([]));

    render(<TaskList />);

    await waitFor(() =>
      expect(screen.getByText(EMPTY_TEXT)).toBeInTheDocument(),
    );

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0];
    expect(url).toMatch(/\/tasks$/);
    expect(init?.method ?? "GET").toBe("GET");
  });

  it("renders three list items in the same order as the response", async () => {
    fetch.mockResolvedValue(jsonResponse(sampleTasks));

    render(<TaskList />);

    const items = await waitFor(() => {
      const found = screen.getAllByRole("listitem");
      expect(found).toHaveLength(3);
      return found;
    });

    expect(items[0].textContent).toContain("First");
    expect(items[1].textContent).toContain("Second");
    expect(items[2].textContent).toContain("Third");
  });

  it("shows the exact empty-state text and no list items for an empty response", async () => {
    fetch.mockResolvedValue(jsonResponse([]));

    render(<TaskList />);

    await waitFor(() =>
      expect(screen.getByText(EMPTY_TEXT)).toBeInTheDocument(),
    );
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });

  it("does not show the empty-state text while the fetch is pending", () => {
    fetch.mockReturnValue(new Promise(() => {}));

    render(<TaskList />);

    expect(screen.queryByText(EMPTY_TEXT)).not.toBeInTheDocument();
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });

  it("shows no empty-state text and no list items when the fetch rejects", async () => {
    fetch.mockRejectedValue(new TypeError("network error"));

    render(<TaskList />);

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    await flushMicrotasks();

    expect(screen.queryByText(EMPTY_TEXT)).not.toBeInTheDocument();
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });

  it("shows no empty-state text and no list items when the fetch resolves 500", async () => {
    fetch.mockResolvedValue(
      jsonResponse({ detail: "Internal Server Error" }, 500),
    );

    render(<TaskList />);

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    await flushMicrotasks();

    expect(screen.queryByText(EMPTY_TEXT)).not.toBeInTheDocument();
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });

  it("renders no loading indicator, alert, or retry button after a failed fetch", async () => {
    fetch.mockRejectedValue(new Error("boom"));

    render(<TaskList />);
    await flushMicrotasks();

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /retry/i }),
    ).not.toBeInTheDocument();
  });

  it("never implements a loading indicator, role=alert error, or Retry button in source", () => {
    expect(sourceJsx).not.toMatch(/role=["']alert["']/);
    expect(sourceJsx).not.toMatch(/role=["']status["']/);
    expect(sourceJsx).not.toMatch(/retry/i);
    expect(sourceJsx).not.toMatch(/spinner/i);
  });

  it("renders list items in API order for tasks with ids 1, 2, 3", async () => {
    const numericIdTasks = [
      {
        id: 1,
        title: "Task One",
        description: "",
        created_at: "2024-01-01T00:00:00Z",
      },
      {
        id: 2,
        title: "Task Two",
        description: "",
        created_at: "2024-01-02T00:00:00Z",
      },
      {
        id: 3,
        title: "Task Three",
        description: "",
        created_at: "2024-01-03T00:00:00Z",
      },
    ];
    fetch.mockResolvedValue(jsonResponse(numericIdTasks));

    render(<TaskList />);

    const items = await waitFor(() => {
      const found = screen.getAllByRole("listitem");
      expect(found).toHaveLength(3);
      return found;
    });

    expect(items[0].textContent).toContain("Task One");
    expect(items[1].textContent).toContain("Task Two");
    expect(items[2].textContent).toContain("Task Three");
  });

  it("shows the description for a task that has one and renders no description element for a task with an empty description", async () => {
    const tasks = [
      {
        id: "with-desc",
        title: "Has description",
        description: "Some details",
        created_at: "2024-01-01T00:00:00Z",
      },
      {
        id: "no-desc",
        title: "No description",
        description: "",
        created_at: "2024-01-02T00:00:00Z",
      },
    ];
    fetch.mockResolvedValue(jsonResponse(tasks));

    render(<TaskList />);

    const items = await waitFor(() => {
      const found = screen.getAllByRole("listitem");
      expect(found).toHaveLength(2);
      return found;
    });

    expect(screen.getByText("Some details")).toBeInTheDocument();
    expect(items[0].querySelector(".task-row__description")).not.toBeNull();
    expect(items[1].querySelector(".task-row__description")).toBeNull();
  });

  it("renders an HTML-looking title as literal text without creating an element", async () => {
    fetch.mockResolvedValue(
      jsonResponse([
        {
          id: "xss",
          title: "<b>x</b>",
          description: "",
          created_at: "2024-01-01T00:00:00Z",
        },
      ]),
    );

    const { container } = render(<TaskList />);

    expect(await screen.findByText("<b>x</b>")).toBeInTheDocument();
    expect(container.querySelector("b")).toBeNull();
  });

  it("re-fetches and reflects new data after unmount and re-render", async () => {
    fetch.mockResolvedValueOnce(jsonResponse(sampleTasks));

    const { unmount } = render(<TaskList />);

    await waitFor(() =>
      expect(screen.getAllByRole("listitem")).toHaveLength(3),
    );
    unmount();

    const updatedTasks = [
      {
        id: "d",
        title: "Fourth",
        description: "",
        created_at: "2024-01-04T00:00:00Z",
      },
    ];
    fetch.mockResolvedValueOnce(jsonResponse(updatedTasks));

    render(<TaskList />);

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("Fourth")).toBeInTheDocument();
    expect(screen.queryByText("Second")).not.toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });

  it("lays rows out with an 8px gap and no bullets, resolved through a design token", () => {
    const rule = sourceCss.match(/\.task-list\s*\{([^}]*)\}/)?.[1] ?? "";
    expect(rule).toMatch(/list-style:\s*none/);

    const gapMatch = rule.match(/gap\s*:\s*([^;]+);/);
    expect(gapMatch).not.toBeNull();

    const varMatch = gapMatch[1].trim().match(/^var\((--[\w-]+)\)$/);
    const resolvedValue = varMatch
      ? tokensCss
          .match(new RegExp(`${varMatch[1]}\\s*:\\s*([^;]+);`))?.[1]
          .trim()
      : gapMatch[1].trim();

    expect(resolvedValue).toBe("8px");
  });
});
