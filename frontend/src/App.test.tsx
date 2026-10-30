import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App.jsx";

function renderApp(initialPath) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <App />
    </MemoryRouter>,
  );
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const sampleTasks = [
  { id: "1", title: "Buy milk", description: "", created_at: "t1" },
  { id: "2", title: "Walk dog", description: "evening", created_at: "t2" },
];

describe("App", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse([])));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("fetches tasks from /api/tasks on load and renders them as cards inside the shell's list region", async () => {
    fetch.mockResolvedValue(jsonResponse(sampleTasks));

    renderApp("/");

    const listRegion = screen.getByTestId("task-list-region");
    const items = await within(listRegion).findAllByRole("listitem");

    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("Buy milk");
    expect(items[1]).toHaveTextContent("Walk dog");

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url] = fetch.mock.calls[0];
    expect(String(url)).toMatch(/\/api\/tasks$/);
  });

  it("shows the exact empty-state text when the backend has no tasks", async () => {
    fetch.mockResolvedValue(jsonResponse([]));

    renderApp("/");

    const listRegion = screen.getByTestId("task-list-region");
    expect(
      await within(listRegion).findByText(
        "No tasks yet. Click Create to add one.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Task Board" }),
    ).toBeInTheDocument();
  });

  it("preserves the backend's task order (not re-sorted) inside the list region", async () => {
    const outOfTitleOrder = [
      { id: "1", title: "Zebra", description: "", created_at: "2024-01-01" },
      { id: "2", title: "Apple", description: "", created_at: "2024-01-02" },
    ];
    fetch.mockResolvedValue(jsonResponse(outOfTitleOrder));

    renderApp("/");

    const listRegion = screen.getByTestId("task-list-region");
    const items = await within(listRegion).findAllByRole("listitem");
    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringContaining("Zebra"),
      expect.stringContaining("Apple"),
    ]);
  });

  it("renders the header and board list placeholder at / inside the 1100px container", async () => {
    renderApp("/");

    expect(
      screen.getByRole("heading", { name: "Task Board" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Boards" })).toBeInTheDocument();
    expect(screen.queryByText(/vite \+ react/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/count is/i)).not.toBeInTheDocument();

    const container = screen.getByTestId("app-root").closest(".container");
    expect(container).not.toBeNull();

    await screen.findByText("No tasks yet. Click Create to add one.");
  });

  it("shows the board detail view with the id from the URL at /boards/42", () => {
    renderApp("/boards/42");

    expect(
      screen.getByRole("heading", { name: /board 42/i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("board-id")).toHaveTextContent("42");
  });

  it("shows a not-found message with a link that navigates back to / for an unknown path", async () => {
    const user = userEvent.setup();
    renderApp("/some/unknown/path");

    expect(
      screen.getByRole("heading", { name: /not found/i }),
    ).toBeInTheDocument();

    const backLink = screen.getByRole("link", { name: /back to boards/i });
    expect(backLink).toHaveAttribute("href", "/");

    await user.click(backLink);

    expect(screen.getByRole("heading", { name: "Boards" })).toBeInTheDocument();
  });

  it("keeps the page header visible while an unknown route renders the not-found page", () => {
    renderApp("/does-not-exist");

    expect(
      screen.getByRole("heading", { name: "Task Board" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Page not found" }),
    ).toBeInTheDocument();
  });
});
