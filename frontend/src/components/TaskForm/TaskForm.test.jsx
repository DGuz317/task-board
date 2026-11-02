import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import TaskForm from "./TaskForm.jsx";

const here = dirname(fileURLToPath(import.meta.url));
const taskFormCss = readFileSync(join(here, "TaskForm.css"), "utf-8");
const tokensCss = readFileSync(
  join(here, "..", "..", "styles", "tokens.css"),
  "utf-8",
);

function resolveVar(name, css) {
  const match = css.match(new RegExp(`${name}\\s*:\\s*([^;]+);`));
  return match ? match[1].trim() : null;
}

describe("TaskForm", () => {
  it("shows 'Title is required' and does not call onSubmit when title is empty", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<TaskForm onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(screen.getByText("Title is required")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows 'Title is required' and does not call onSubmit when title is whitespace-only", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<TaskForm onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText("Title"), "   ");
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(screen.getByText("Title is required")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("renders the error inside an aria-live='polite' region", async () => {
    const user = userEvent.setup();
    render(<TaskForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Create" }));

    const error = screen.getByText("Title is required");
    expect(error.closest('[aria-live="polite"]')).not.toBeNull();
  });

  it("marks the title input aria-invalid with aria-describedby referencing the error, and clears both when valid", async () => {
    const user = userEvent.setup();
    render(<TaskForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

    const titleInput = screen.getByLabelText("Title");
    expect(titleInput).not.toHaveAttribute("aria-invalid", "true");

    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(titleInput).toHaveAttribute("aria-invalid", "true");
    const describedBy = titleInput.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy)).toHaveTextContent(
      "Title is required",
    );

    await user.type(titleInput, "Buy milk");
    expect(titleInput).not.toHaveAttribute("aria-invalid", "true");
    expect(titleInput).not.toHaveAttribute("aria-describedby");
  });

  it("calls onSubmit with exactly {title:'Hello', description:'x'} for '  Hello  ' / 'x'", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<TaskForm onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText("Title"), "  Hello  ");
    await user.type(screen.getByLabelText("Description"), "x");
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({ title: "Hello", description: "x" });
  });

  it("shows a length error and does not submit for a 101-char title, but accepts exactly 100 chars", async () => {
    const onSubmit = vi.fn();
    const { rerender } = render(
      <TaskForm onSubmit={onSubmit} onCancel={vi.fn()} />,
    );

    const titleInput = screen.getByLabelText("Title");
    fireEventPaste(titleInput, "a".repeat(101));
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Create" }));

    expect(
      screen.getByText("Title must be 100 characters or fewer"),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();

    rerender(<TaskForm onSubmit={onSubmit} onCancel={vi.fn()} />);
    const freshTitleInput = screen.getByLabelText("Title");
    fireEventPaste(freshTitleInput, "a".repeat(100));
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Create" }));

    expect(
      screen.queryByText("Title must be 100 characters or fewer"),
    ).not.toBeInTheDocument();
    expect(onSubmit).toHaveBeenCalledWith({
      title: "a".repeat(100),
      description: "",
    });
  });

  it("shows a length error and does not submit for a 501-char description, but accepts exactly 500 chars", async () => {
    const onSubmit = vi.fn();
    render(<TaskForm onSubmit={onSubmit} onCancel={vi.fn()} />);

    const titleInput = screen.getByLabelText("Title");
    const descriptionInput = screen.getByLabelText("Description");

    await userEvent.setup().type(titleInput, "Buy milk");
    fireEventPaste(descriptionInput, "a".repeat(501));
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Create" }));

    expect(
      screen.getByText("Description must be 500 characters or fewer"),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();

    fireEventPaste(descriptionInput, "a".repeat(500));
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Create" }));

    expect(
      screen.queryByText("Description must be 500 characters or fewer"),
    ).not.toBeInTheDocument();
    expect(onSubmit).toHaveBeenCalledWith({
      title: "Buy milk",
      description: "a".repeat(500),
    });
  });

  it("calls onCancel and never onSubmit when Cancel is clicked", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const onCancel = vi.fn();
    render(<TaskForm onSubmit={onSubmit} onCancel={onCancel} />);

    await user.type(screen.getByLabelText("Title"), "Buy milk");
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("pre-fills Title and Description from initialValues", () => {
    render(
      <TaskForm
        initialValues={{ title: "Existing", description: "Existing desc" }}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Title")).toHaveValue("Existing");
    expect(screen.getByLabelText("Description")).toHaveValue("Existing desc");
  });

  it("defines the submit button at 40px height, 8px radius, with #2563EB background via tokens", () => {
    const primaryBlockMatch = taskFormCss.match(
      /\.task-form__button--primary\s*\{([^}]*)\}/,
    );
    expect(primaryBlockMatch).not.toBeNull();
    expect(primaryBlockMatch[1]).toMatch(/background:\s*var\(--color-accent\)/);
    expect(resolveVar("--color-accent", tokensCss).toLowerCase()).toBe(
      "#2563eb",
    );

    const buttonBlockMatch = taskFormCss.match(
      /\.task-form__button\s*\{([^}]*)\}/,
    );
    expect(buttonBlockMatch).not.toBeNull();
    expect(buttonBlockMatch[1]).toMatch(/height:\s*var\(--control-height\)/);
    expect(buttonBlockMatch[1]).toMatch(/border-radius:\s*var\(--radius-md\)/);
    expect(resolveVar("--control-height", tokensCss)).toBe("40px");
    expect(resolveVar("--radius-md", tokensCss)).toBe("8px");
  });
});

function fireEventPaste(input, value) {
  // Faster than user.type for very long strings.
  fireEvent.change(input, { target: { value } });
}
