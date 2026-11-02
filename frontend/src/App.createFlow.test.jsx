import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App.jsx";
import { createFetchMock, postCalls } from "./test/mockFetch.js";

const taskA = { id: "a", title: "A", description: "", created_at: "t1" };
const taskB = { id: "b", title: "B", description: "", created_at: "t2" };
const taskC = { id: "c", title: "C", description: "", created_at: "t3" };

describe("App create flow", () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = createFetchMock({
      listResponse: [taskA, taskB],
      createdTask: taskC,
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("creates task C via the Create button and renders A, B, C in DOM order", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    );

    const listRegion = screen.getByTestId("task-list-region");
    await within(listRegion).findAllByRole("listitem");

    await user.click(screen.getByRole("button", { name: "Create" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("Title"), "C");
    await user.click(within(dialog).getByRole("button", { name: "Create" }));

    await within(listRegion).findByText("C");
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );

    const items = within(listRegion).getAllByRole("listitem");
    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringContaining("A"),
      expect.stringContaining("B"),
      expect.stringContaining("C"),
    ]);

    const posts = postCalls(fetchMock);
    expect(posts).toHaveLength(1);
    const [, init] = posts[0];
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(init.body)).toEqual({ title: "C", description: "" });
  });
});
