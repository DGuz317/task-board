import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TaskList from "./TaskList.jsx";

const EMPTY_TEXT = "No tasks yet. Click Create to add one.";

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function getMethod(url, init) {
  return init?.method ?? "GET";
}

function makeFetchMock({ initialTasks, createdTask, failCreate = false }) {
  return vi.fn((url, init) => {
    const method = getMethod(url, init);
    if (method === "GET") {
      return Promise.resolve(jsonResponse(initialTasks));
    }
    if (method === "POST") {
      if (failCreate) {
        return Promise.resolve(jsonResponse({ detail: "boom" }, 500));
      }
      return Promise.resolve(jsonResponse(createdTask));
    }
    return Promise.reject(new Error(`unexpected ${method} request to ${url}`));
  });
}

function getCount(fetchMock) {
  return (method) =>
    fetchMock.mock.calls.filter(
      ([url, init]) => getMethod(url, init) === method,
    ).length;
}

const taskA = { id: "a", title: "A", description: "", created_at: "t1" };
const taskB = { id: "b", title: "B", description: "", created_at: "t2" };
const taskC = { id: "c", title: "C", description: "", created_at: "t3" };

describe("TaskList create flow", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("shows the Create button in the header with zero tasks and with many tasks", async () => {
    fetch.mockImplementation(makeFetchMock({ initialTasks: [] }));
    render(<TaskList />);

    expect(screen.getByRole("button", { name: "Create" })).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText(EMPTY_TEXT)).toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: "Create" })).toBeInTheDocument();
  });

  it("shows the Create button when many tasks are already rendered", async () => {
    const manyTasks = Array.from({ length: 25 }, (_, i) => ({
      id: `t${i}`,
      title: `Task ${i}`,
      description: "",
      created_at: `t${i}`,
    }));
    fetch.mockImplementation(makeFetchMock({ initialTasks: manyTasks }));
    render(<TaskList />);

    await waitFor(() =>
      expect(screen.getAllByRole("listitem")).toHaveLength(25),
    );
    expect(screen.getByRole("button", { name: "Create" })).toBeInTheDocument();
  });

  it("opens a dialog with Title, Description, Create, and Cancel controls on click", async () => {
    fetch.mockImplementation(makeFetchMock({ initialTasks: [] }));
    const user = userEvent.setup();
    render(<TaskList />);
    await waitFor(() =>
      expect(screen.getByText(EMPTY_TEXT)).toBeInTheDocument(),
    );

    await user.click(screen.getByRole("button", { name: "Create" }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByLabelText("Title")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Description")).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: "Create" }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: "Cancel" }),
    ).toBeInTheDocument();
  });

  it("submitting a valid title closes the dialog and appends the task to the bottom without refetching", async () => {
    const fetchMock = makeFetchMock({
      initialTasks: [taskA, taskB],
      createdTask: taskC,
    });
    fetch.mockImplementation(fetchMock);
    const countOf = getCount(fetch);
    const user = userEvent.setup();
    render(<TaskList />);

    await waitFor(() =>
      expect(screen.getAllByRole("listitem")).toHaveLength(2),
    );
    expect(countOf("GET")).toBe(1);

    await user.click(screen.getByRole("button", { name: "Create" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("Title"), "C");
    await user.click(within(dialog).getByRole("button", { name: "Create" }));

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[0].textContent).toContain("A");
    expect(items[1].textContent).toContain("B");
    expect(items[2].textContent).toContain("C");
    expect(countOf("GET")).toBe(1);
    expect(countOf("POST")).toBe(1);
  });

  it("replaces the empty-state text with the task row when the first task is created", async () => {
    const fetchMock = makeFetchMock({ initialTasks: [], createdTask: taskA });
    fetch.mockImplementation(fetchMock);
    const user = userEvent.setup();
    render(<TaskList />);

    await waitFor(() =>
      expect(screen.getByText(EMPTY_TEXT)).toBeInTheDocument(),
    );

    await user.click(screen.getByRole("button", { name: "Create" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("Title"), "A");
    await user.click(within(dialog).getByRole("button", { name: "Create" }));

    await waitFor(() =>
      expect(screen.getByRole("listitem")).toBeInTheDocument(),
    );
    expect(screen.queryByText(EMPTY_TEXT)).not.toBeInTheDocument();
  });

  it("returns focus to the Create button after close via submit, Cancel, and Esc", async () => {
    const fetchMock = makeFetchMock({ initialTasks: [], createdTask: taskA });
    fetch.mockImplementation(fetchMock);
    const user = userEvent.setup();
    render(<TaskList />);
    await waitFor(() =>
      expect(screen.getByText(EMPTY_TEXT)).toBeInTheDocument(),
    );
    const createButton = screen.getByRole("button", { name: "Create" });

    // Submit path
    await user.click(createButton);
    await user.type(screen.getByLabelText("Title"), "A");
    await user.click(
      screen.getByRole("dialog").querySelector("button[type='submit']"),
    );
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    await waitFor(() => expect(createButton).toHaveFocus());

    // Cancel path
    await user.click(createButton);
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(createButton).toHaveFocus();

    // Esc path
    await user.click(createButton);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(createButton).toHaveFocus();
  });

  it("Cancel closes the dialog, leaves the list unchanged, and makes no POST call", async () => {
    const fetchMock = makeFetchMock({ initialTasks: [taskA, taskB] });
    fetch.mockImplementation(fetchMock);
    const countOf = getCount(fetch);
    const user = userEvent.setup();
    render(<TaskList />);
    await waitFor(() =>
      expect(screen.getAllByRole("listitem")).toHaveLength(2),
    );

    await user.click(screen.getByRole("button", { name: "Create" }));
    await user.type(screen.getByLabelText("Title"), "Ignored");
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(countOf("POST")).toBe(0);
  });

  it("Esc closes the dialog, leaves the list unchanged, and makes no POST call", async () => {
    const fetchMock = makeFetchMock({ initialTasks: [taskA, taskB] });
    fetch.mockImplementation(fetchMock);
    const countOf = getCount(fetch);
    const user = userEvent.setup();
    render(<TaskList />);
    await waitFor(() =>
      expect(screen.getAllByRole("listitem")).toHaveLength(2),
    );

    await user.click(screen.getByRole("button", { name: "Create" }));
    await user.type(screen.getByLabelText("Title"), "Ignored");
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(countOf("POST")).toBe(0);
  });

  it("keeps the dialog open and the list unchanged when the create request fails", async () => {
    const fetchMock = makeFetchMock({
      initialTasks: [taskA],
      failCreate: true,
    });
    fetch.mockImplementation(fetchMock);
    const user = userEvent.setup();
    render(<TaskList />);
    await waitFor(() =>
      expect(screen.getAllByRole("listitem")).toHaveLength(1),
    );

    await user.click(screen.getByRole("button", { name: "Create" }));
    await user.type(screen.getByLabelText("Title"), "Will fail");
    await user.click(
      screen.getByRole("dialog").querySelector("button[type='submit']"),
    );

    await screen.findByRole("alert");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });
});
