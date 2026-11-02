import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { useRef, useState, StrictMode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import Modal from "./Modal.jsx";

const here = dirname(fileURLToPath(import.meta.url));
const modalCss = readFileSync(join(here, "Modal.css"), "utf-8");

function ThreeButtonModal(props) {
  return (
    <Modal open title="Settings" onClose={() => {}} {...props}>
      <button type="button">First</button>
      <button type="button">Middle</button>
      <button type="button">Last</button>
    </Modal>
  );
}

function Harness({ onCloseSpy }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);

  return (
    <div>
      <button ref={triggerRef} type="button" onClick={() => setOpen(true)}>
        Open modal
      </button>
      <Modal
        open={open}
        title="Harness modal"
        onClose={() => {
          onCloseSpy?.();
          setOpen(false);
        }}
      >
        <button type="button">Inside action</button>
      </Modal>
    </div>
  );
}

describe("Modal", () => {
  it("exposes role=dialog with aria-modal and aria-labelledby pointing at the title text", () => {
    render(<Modal open title="Settings" onClose={vi.fn()} />);

    const dialog = screen.getByRole("dialog", { name: "Settings" });
    expect(dialog).toHaveAttribute("aria-modal", "true");

    const labelledBy = dialog.getAttribute("aria-labelledby");
    expect(labelledBy).toBeTruthy();
    const labelEl = document.getElementById(labelledBy);
    expect(labelEl).not.toBeNull();
    expect(labelEl.textContent).toBe("Settings");
  });

  it("renders no dialog DOM at all when open is false", () => {
    render(<Modal open={false} title="Settings" onClose={vi.fn()} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.querySelector(".modal-scrim")).toBeNull();
    expect(document.querySelector(".modal-panel")).toBeNull();
  });

  it("moves focus inside the dialog to the first focusable element when opened", () => {
    render(<ThreeButtonModal />);

    expect(screen.getByRole("button", { name: "First" })).toHaveFocus();
  });

  it("falls back to focusing the panel itself when there are no focusable children", () => {
    render(<Modal open title="Empty" onClose={vi.fn()} />);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveFocus();
  });

  it("keeps focus on the panel when Tab is pressed with no focusable children", async () => {
    const user = userEvent.setup();
    render(<Modal open title="Empty" onClose={vi.fn()} />);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveFocus();

    await user.tab();

    expect(dialog).toHaveFocus();
  });

  it("wraps focus from the last element to the first on Tab", async () => {
    const user = userEvent.setup();
    render(<ThreeButtonModal />);

    const last = screen.getByRole("button", { name: "Last" });
    last.focus();
    expect(last).toHaveFocus();

    await user.tab();

    expect(screen.getByRole("button", { name: "First" })).toHaveFocus();
  });

  it("wraps focus from the first element to the last on Shift+Tab", async () => {
    const user = userEvent.setup();
    render(<ThreeButtonModal />);

    const first = screen.getByRole("button", { name: "First" });
    first.focus();
    expect(first).toHaveFocus();

    await user.tab({ shift: true });

    expect(screen.getByRole("button", { name: "Last" })).toHaveFocus();
  });

  it("calls onClose exactly once when Escape is pressed", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Modal open title="Settings" onClose={onClose} />);

    await user.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose exactly once when Escape is pressed under React.StrictMode", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <StrictMode>
        <Modal open title="Settings" onClose={onClose} />
      </StrictMode>,
    );

    await user.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose exactly once when clicking the scrim backdrop, but not when clicking inside the panel", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ThreeButtonModal onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: "Middle" }));
    expect(onClose).not.toHaveBeenCalled();

    const scrim = document.querySelector(".modal-scrim");
    fireEvent.click(scrim);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("returns focus to the previously focused trigger after the modal closes", async () => {
    const user = userEvent.setup();
    const onCloseSpy = vi.fn();
    render(<Harness onCloseSpy={onCloseSpy} />);

    const trigger = screen.getByRole("button", { name: "Open modal" });
    await user.click(trigger);

    expect(screen.getByRole("button", { name: "Inside action" })).toHaveFocus();

    await user.keyboard("{Escape}");

    expect(onCloseSpy).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("defines the scrim as a 40% black overlay and the panel as a fixed 480px width", () => {
    expect(modalCss).toMatch(/\.modal-scrim\s*\{[^}]*rgba\(0,0,0,0\.4\)/);
    expect(modalCss).toMatch(/\.modal-panel\s*\{[^}]*width:\s*480px/);
  });

  it("limits every transition to color/opacity between 100ms and 150ms and never uses transition: all", () => {
    expect(modalCss).not.toMatch(/transition:\s*all\b/);

    const declarations = [...modalCss.matchAll(/transition:\s*([^;]+);/g)].map(
      (match) => match[1].trim(),
    );
    expect(declarations.length).toBeGreaterThan(0);

    for (const declaration of declarations) {
      if (declaration === "none") {
        continue;
      }

      const clauses = declaration.split(",").map((clause) => clause.trim());
      expect(clauses.length).toBeGreaterThan(0);

      for (const clause of clauses) {
        const clauseMatch = clause.match(/^(color|opacity)\s+(\d+)ms\b/);
        expect(clauseMatch).not.toBeNull();

        const duration = Number(clauseMatch[2]);
        expect(duration).toBeGreaterThanOrEqual(100);
        expect(duration).toBeLessThanOrEqual(150);
      }
    }
  });
});
