import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TaskList from "./TaskList.jsx";
import { createFetchMock } from "../../test/mockFetch.js";

const EMPTY_TEXT = "No tasks yet. Click Create to add one.";

describe("TaskList create modal focus trap", () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = createFetchMock({ listResponse: [] });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("wraps Tab/Shift+Tab focus within the dialog and returns focus to the Create button once it closes", async () => {
    const user = userEvent.setup();
    render(<TaskList />);
    await waitFor(() =>
      expect(screen.getByText(EMPTY_TEXT)).toBeInTheDocument(),
    );

    const createButton = screen.getByRole("button", { name: "Create" });
    await user.click(createButton);

    const dialog = screen.getByRole("dialog");
    const titleInput = within(dialog).getByLabelText("Title");
    const submitButton = within(dialog).getByRole("button", { name: "Create" });

    expect(titleInput).toHaveFocus();

    // Shift+Tab from the first focusable element wraps to the last.
    await user.tab({ shift: true });
    expect(submitButton).toHaveFocus();
    expect(dialog.contains(document.activeElement)).toBe(true);

    // Tab from the last focusable element wraps back to the first.
    await user.tab();
    expect(titleInput).toHaveFocus();
    expect(dialog.contains(document.activeElement)).toBe(true);

    await user.keyboard("{Escape}");

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    await waitFor(() => expect(createButton).toHaveFocus());
  });
});
