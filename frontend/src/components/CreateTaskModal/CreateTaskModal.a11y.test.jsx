import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CreateTaskModal from "./CreateTaskModal.jsx";
import { createFetchMock, postCalls } from "../../test/mockFetch.js";

describe("CreateTaskModal accessibility", () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = createFetchMock({ listResponse: [] });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("exposes role=dialog with aria-modal=true and aria-labelledby resolving to 'Create task'", () => {
    render(<CreateTaskModal isOpen onClose={vi.fn()} onCreated={vi.fn()} />);

    const dialog = screen.getByRole("dialog", { name: "Create task" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("announces 'Title is required' inside an aria-live='polite' region and sends no POST request", async () => {
    const user = userEvent.setup();
    render(<CreateTaskModal isOpen onClose={vi.fn()} onCreated={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Create" }));

    const error = screen.getByText("Title is required");
    expect(error.closest('[aria-live="polite"]')).not.toBeNull();
    expect(postCalls(fetchMock)).toHaveLength(0);
  });
});
