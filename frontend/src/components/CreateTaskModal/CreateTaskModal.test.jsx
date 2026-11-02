import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import CreateTaskModal from "./CreateTaskModal.jsx";
import { createTask } from "../../api/tasks.js";

vi.mock("../../api/tasks.js", () => ({
  createTask: vi.fn(),
}));

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("CreateTaskModal", () => {
  it("calls createTask exactly once with the trimmed title and description for a valid submit", async () => {
    const task = {
      id: "1",
      title: "Title",
      description: "Desc",
      created_at: "now",
    };
    createTask.mockResolvedValueOnce(task);
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const onCreated = vi.fn();
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(<CreateTaskModal isOpen onClose={onClose} onCreated={onCreated} />);

    await user.type(screen.getByLabelText("Title"), "  Title  ");
    await user.type(screen.getByLabelText("Description"), "  Desc  ");
    await user.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => expect(createTask).toHaveBeenCalledTimes(1));
    expect(createTask).toHaveBeenCalledWith({
      title: "Title",
      description: "Desc",
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("calls onCreated with the returned task and then onClose when createTask resolves", async () => {
    const task = {
      id: "1",
      title: "Title",
      description: "",
      created_at: "now",
    };
    createTask.mockResolvedValueOnce(task);
    const onCreated = vi.fn();
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(<CreateTaskModal isOpen onClose={onClose} onCreated={onCreated} />);

    await user.type(screen.getByLabelText("Title"), "Title");
    await user.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(task));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("makes zero createTask/fetch calls and does not close when the title is empty", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(<CreateTaskModal isOpen onClose={onClose} onCreated={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(screen.getByText("Title is required")).toBeInTheDocument();
    expect(createTask).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("calls onClose with zero createTask calls on Esc", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(<CreateTaskModal isOpen onClose={onClose} onCreated={vi.fn()} />);
    await user.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(createTask).not.toHaveBeenCalled();
  });

  it("calls onClose with zero createTask calls on Cancel click", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(<CreateTaskModal isOpen onClose={onClose} onCreated={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(createTask).not.toHaveBeenCalled();
  });

  it("keeps the dialog open, shows a role=alert error, and preserves input when createTask rejects", async () => {
    createTask.mockRejectedValueOnce(new Error("network down"));
    const onCreated = vi.fn();
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(<CreateTaskModal isOpen onClose={onClose} onCreated={onCreated} />);

    await user.type(screen.getByLabelText("Title"), "Title");
    await user.type(screen.getByLabelText("Description"), "Desc");
    await user.click(screen.getByRole("button", { name: "Create" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "Could not create the task. Please try again.",
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(onCreated).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Title")).toHaveValue("Title");
    expect(screen.getByLabelText("Description")).toHaveValue("Desc");
    expect(screen.getByRole("button", { name: "Create" })).not.toBeDisabled();
  });

  it("disables the submit button while pending and ignores a second submit until the request settles", async () => {
    let resolveCreate;
    createTask.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCreate = resolve;
        }),
    );
    const onCreated = vi.fn();
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(<CreateTaskModal isOpen onClose={onClose} onCreated={onCreated} />);

    await user.type(screen.getByLabelText("Title"), "Title");
    const submitButton = screen.getByRole("button", { name: "Create" });
    await user.click(submitButton);

    await waitFor(() => expect(submitButton).toBeDisabled());
    await user.click(submitButton);
    expect(createTask).toHaveBeenCalledTimes(1);

    const task = {
      id: "1",
      title: "Title",
      description: "",
      created_at: "now",
    };
    resolveCreate(task);

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(task));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders an accessible dialog labelled 'Create task' and clears a prior error on retry success", async () => {
    createTask.mockRejectedValueOnce(new Error("boom"));
    const task = {
      id: "2",
      title: "Retry",
      description: "",
      created_at: "now",
    };
    createTask.mockResolvedValueOnce(task);
    const onCreated = vi.fn();
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(<CreateTaskModal isOpen onClose={onClose} onCreated={onCreated} />);

    expect(
      screen.getByRole("dialog", { name: "Create task" }),
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText("Title"), "Retry");
    await user.click(screen.getByRole("button", { name: "Create" }));
    await screen.findByRole("alert");

    await user.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(task));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("resets stale pending/error state when the modal closes and reopens", async () => {
    createTask.mockRejectedValueOnce(new Error("boom"));
    const onClose = vi.fn();
    const user = userEvent.setup();

    const { rerender } = render(
      <CreateTaskModal isOpen onClose={onClose} onCreated={vi.fn()} />,
    );

    await user.type(screen.getByLabelText("Title"), "Title");
    await user.click(screen.getByRole("button", { name: "Create" }));
    await screen.findByRole("alert");

    rerender(
      <CreateTaskModal isOpen={false} onClose={onClose} onCreated={vi.fn()} />,
    );
    rerender(<CreateTaskModal isOpen onClose={onClose} onCreated={vi.fn()} />);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toHaveValue("");
    expect(screen.getByRole("button", { name: "Create" })).not.toBeDisabled();
  });
});
