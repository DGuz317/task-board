import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import TaskActionsMenu from "./TaskActionsMenu.jsx";

const here = dirname(fileURLToPath(import.meta.url));
const menuCss = readFileSync(join(here, "TaskActionsMenu.css"), "utf-8");
const tokensCss = readFileSync(
  join(here, "..", "styles", "tokens.css"),
  "utf-8",
);

function resolveVar(name, css) {
  const match = css.match(new RegExp(`${name}\\s*:\\s*([^;]+);`));
  return match ? match[1].trim() : null;
}

function resolveToValue(rawValue, css) {
  const varMatch = rawValue.trim().match(/^var\((--[\w-]+)\)$/);
  if (varMatch) {
    return resolveVar(varMatch[1], css);
  }
  return rawValue.trim();
}

function renderMenu(props = {}) {
  const onEdit = props.onEdit ?? vi.fn();
  const onDelete = props.onDelete ?? vi.fn();
  render(<TaskActionsMenu onEdit={onEdit} onDelete={onDelete} />);
  return { onEdit, onDelete };
}

describe("TaskActionsMenu", () => {
  it("renders a trigger button with the required ARIA attributes and no menu initially", () => {
    renderMenu();

    const trigger = screen.getByRole("button", { name: "Task actions" });
    expect(trigger).toHaveAttribute("aria-haspopup", "menu");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("clicking the trigger opens the menu with exactly two items, Edit and Delete", async () => {
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByRole("button", { name: "Task actions" }));

    expect(
      screen.getByRole("button", { name: "Task actions" }),
    ).toHaveAttribute("aria-expanded", "true");

    const menu = screen.getByRole("menu");
    const items = screen.getAllByRole("menuitem");
    expect(menu).toBeInTheDocument();
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveAccessibleName("Edit");
    expect(items[1]).toHaveAccessibleName("Delete");
  });

  it("opens the menu and focuses the first item when Enter is pressed on the focused trigger", async () => {
    const user = userEvent.setup();
    renderMenu();

    screen.getByRole("button", { name: "Task actions" }).focus();
    await user.keyboard("{Enter}");

    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Edit" })).toHaveFocus();
  });

  it("opens the menu and focuses the first item when Space is pressed on the focused trigger", async () => {
    const user = userEvent.setup();
    renderMenu();

    screen.getByRole("button", { name: "Task actions" }).focus();
    await user.keyboard(" ");

    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Edit" })).toHaveFocus();
  });

  it("moves focus between items with ArrowDown/ArrowUp and wraps at both ends", async () => {
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByRole("button", { name: "Task actions" }));
    const edit = screen.getByRole("menuitem", { name: "Edit" });
    const del = screen.getByRole("menuitem", { name: "Delete" });

    expect(edit).toHaveFocus();

    await user.keyboard("{ArrowDown}");
    expect(del).toHaveFocus();

    await user.keyboard("{ArrowDown}");
    expect(edit).toHaveFocus();

    await user.keyboard("{ArrowUp}");
    expect(del).toHaveFocus();
  });

  it("calls onEdit and closes the menu when Enter is pressed on the focused Edit item", async () => {
    const user = userEvent.setup();
    const { onEdit, onDelete } = renderMenu();

    await user.click(screen.getByRole("button", { name: "Task actions" }));
    await user.keyboard("{Enter}");

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("calls onDelete and closes the menu when Enter is pressed on the focused Delete item", async () => {
    const user = userEvent.setup();
    const { onEdit, onDelete } = renderMenu();

    await user.click(screen.getByRole("button", { name: "Task actions" }));
    await user.keyboard("{ArrowDown}{Enter}");

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onEdit).not.toHaveBeenCalled();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("closes the menu and returns focus to the trigger when Escape is pressed", async () => {
    const user = userEvent.setup();
    renderMenu();

    const trigger = screen.getByRole("button", { name: "Task actions" });
    await user.click(trigger);
    expect(screen.getByRole("menu")).toBeInTheDocument();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveFocus();
  });

  it("closes the menu and resets aria-expanded on mousedown outside, without stealing focus", async () => {
    const user = userEvent.setup();
    renderMenu();

    const trigger = screen.getByRole("button", { name: "Task actions" });
    await user.click(trigger);
    expect(screen.getByRole("menu")).toBeInTheDocument();

    const outside = document.createElement("button");
    document.body.appendChild(outside);

    fireEvent.mouseDown(outside);

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).not.toHaveFocus();

    document.body.removeChild(outside);
  });

  it("does not close the menu when mousedown happens inside it", async () => {
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByRole("button", { name: "Task actions" }));
    const menu = screen.getByRole("menu");

    fireEvent.mouseDown(menu);

    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("removes the outside-mousedown listener on unmount without throwing, even while open", async () => {
    const user = userEvent.setup();
    const removeSpy = vi.spyOn(document, "removeEventListener");
    const { unmount } = render(
      <TaskActionsMenu onEdit={vi.fn()} onDelete={vi.fn()} />,
    );

    await user.click(screen.getByRole("button", { name: "Task actions" }));
    expect(screen.getByRole("menu")).toBeInTheDocument();

    expect(() => unmount()).not.toThrow();
    expect(removeSpy).toHaveBeenCalledWith("mousedown", expect.any(Function));

    removeSpy.mockRestore();
  });

  it("defines the menu item height, Delete color, and hover background as the exact required values", () => {
    const itemRule = menuCss.match(/\.task-actions-menu__item\s*\{([^}]*)\}/);
    expect(itemRule).not.toBeNull();
    const heightDeclaration = itemRule[1].match(/height\s*:\s*([^;]+);/);
    expect(heightDeclaration).not.toBeNull();
    expect(resolveToValue(heightDeclaration[1], tokensCss)).toBe("36px");

    const dangerRule = menuCss.match(
      /\.task-actions-menu__item--danger\s*\{([^}]*)\}/,
    );
    expect(dangerRule).not.toBeNull();
    const colorDeclaration = dangerRule[1].match(/color\s*:\s*([^;]+);/);
    expect(colorDeclaration).not.toBeNull();
    expect(resolveToValue(colorDeclaration[1], tokensCss).toLowerCase()).toBe(
      "#dc2626",
    );

    const hoverRule = menuCss.match(
      /\.task-actions-menu__item:hover,\s*\n?\s*\.task-actions-menu__item:focus-visible\s*\{([^}]*)\}/,
    );
    expect(hoverRule).not.toBeNull();
    const hoverBackground = hoverRule[1].match(/background\s*:\s*([^;]+);/);
    expect(hoverBackground).not.toBeNull();
    expect(resolveToValue(hoverBackground[1], tokensCss).toLowerCase()).toBe(
      "#f3f4f6",
    );
  });

  it("styles the popover with tokens (shadow, radius, border, spacing) rather than hard-coded one-off values", () => {
    const listRule = menuCss.match(/\.task-actions-menu__list\s*\{([^}]*)\}/);
    expect(listRule).not.toBeNull();
    const body = listRule[1];

    expect(body).toMatch(/box-shadow\s*:\s*var\(--shadow-sm\)/);
    expect(body).toMatch(/border-radius\s*:\s*var\(--radius-md\)/);
    expect(body).toMatch(
      /border\s*:\s*var\(--border-width\)\s+solid\s+var\(--color-border\)/,
    );
    expect(body).toMatch(/padding\s*:\s*var\(--space-1\)/);
    expect(body).not.toMatch(/#[0-9a-fA-F]{3,6}/);
  });
});
