import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CreateTaskModal from "./CreateTaskModal.jsx";
import { createFetchMock, postCalls } from "../../test/mockFetch.js";

// These tests exercise the real api/tasks.js -> api/client.js -> fetch
// pipeline (fetch itself is stubbed) rather than mocking api/tasks.js, so a
// regression that accidentally fires a request is actually caught.
describe("CreateTaskModal validation (real fetch pipeline)", () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = createFetchMock({ listResponse: [] });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it.each([
    ["empty", ""],
    ["whitespace-only", "   "],
  ])(
    "shows 'Title is required' for a %s title and sends no POST request",
    async (_label, title) => {
      const user = userEvent.setup();
      render(<CreateTaskModal isOpen onClose={vi.fn()} onCreated={vi.fn()} />);

      if (title) {
        await user.type(screen.getByLabelText("Title"), title);
      }
      await user.click(screen.getByRole("button", { name: "Create" }));

      expect(screen.getByText("Title is required")).toBeInTheDocument();
      expect(postCalls(fetchMock)).toHaveLength(0);
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    },
  );

  it("shows both length-limit messages for a 101-char title and a 501-char description and sends no POST request", async () => {
    const user = userEvent.setup();
    render(<CreateTaskModal isOpen onClose={vi.fn()} onCreated={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "a".repeat(101) },
    });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "b".repeat(501) },
    });
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(
      screen.getByText("Title must be 100 characters or fewer"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Description must be 500 characters or fewer"),
    ).toBeInTheDocument();
    expect(postCalls(fetchMock)).toHaveLength(0);
  });
});
