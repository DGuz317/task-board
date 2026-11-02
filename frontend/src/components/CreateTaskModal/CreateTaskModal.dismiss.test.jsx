import { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CreateTaskModal from "./CreateTaskModal.jsx";
import { createFetchMock, postCalls } from "../../test/mockFetch.js";

// A thin stateful wrapper so closing the dialog actually removes it from the
// DOM, the way it behaves inside the real TaskList composition.
function Harness() {
  const [isOpen, setIsOpen] = useState(true);
  return (
    <CreateTaskModal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      onCreated={vi.fn()}
    />
  );
}

describe("CreateTaskModal dismissal (real fetch pipeline)", () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = createFetchMock({ listResponse: [] });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("closes the dialog on Escape with zero POST requests", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText("Title"), "Ignored");
    await user.keyboard("{Escape}");

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(postCalls(fetchMock)).toHaveLength(0);
  });

  it("closes the dialog on Cancel with zero POST requests", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText("Title"), "Ignored");
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(postCalls(fetchMock)).toHaveLength(0);
  });
});
