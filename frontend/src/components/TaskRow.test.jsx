import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import TaskRow from "./TaskRow.jsx";

const here = dirname(fileURLToPath(import.meta.url));
const sourceJsx = readFileSync(join(here, "TaskRow.jsx"), "utf-8");
const sourceCss = readFileSync(join(here, "TaskRow.css"), "utf-8");
const tokensCss = readFileSync(
  join(here, "..", "styles", "tokens.css"),
  "utf-8",
);

function cssRule(css, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return css.match(new RegExp(`${escaped}\\s*{([^}]*)}`))?.[1] ?? "";
}

function renderRow(props) {
  const { container } = render(
    <ul>
      <TaskRow {...props} />
    </ul>,
  );
  return container.querySelector(".task-row");
}

describe("TaskRow", () => {
  it("re-exports the same component from the legacy .tsx entry point", async () => {
    const legacy = await import("./TaskRow.tsx");
    expect(legacy.default).toBe(TaskRow);
    expect(legacy.TaskRow).toBe(TaskRow);
  });

  it("renders the title and no description element when none is given", () => {
    const row = renderRow({ title: "Buy milk" });
    expect(screen.getByText("Buy milk")).toBeInTheDocument();
    expect(row.querySelector(".task-row__description")).toBeNull();
  });

  it("renders no description element for an empty-string description", () => {
    const row = renderRow({ title: "Buy milk", description: "" });
    expect(row.querySelector(".task-row__description")).toBeNull();
  });

  it("renders no description element when description is null", () => {
    const row = renderRow({ title: "Buy milk", description: null });
    expect(row.querySelector(".task-row__description")).toBeNull();
  });

  it("renders a description in an element distinct from the title", () => {
    const row = renderRow({ title: "Buy milk", description: "2% please" });
    const title = row.querySelector(".task-row__title");
    const description = row.querySelector(".task-row__description");

    expect(title).not.toBeNull();
    expect(description).not.toBeNull();
    expect(title).not.toBe(description);
    expect(title.textContent).toBe("Buy milk");
    expect(description.textContent).toBe("2% please");
    expect(title.contains(description)).toBe(false);
    expect(description.contains(title)).toBe(false);
  });

  it("renders a script-tag title as literal text with no script element created", () => {
    const malicious = "<script>alert(1)</script>";
    const row = renderRow({ title: malicious });

    expect(screen.getByText(malicious)).toBeInTheDocument();
    expect(row.querySelector("script")).toBeNull();
    expect(document.querySelector("script[src]")).toBeNull();
  });

  it("never uses dangerouslySetInnerHTML in the component or its stylesheet", () => {
    expect(sourceJsx).not.toContain("dangerouslySetInnerHTML");
    expect(sourceCss).not.toContain("dangerouslySetInnerHTML");
  });

  it("renders a dedicated actions slot as the last child, after the text block", () => {
    const row = renderRow({ title: "Buy milk", description: "whole" });
    const actions = screen.getByTestId("task-row-actions");
    const text = row.querySelector(".task-row__text");

    expect(actions.parentElement).toBe(row);
    expect(row.lastElementChild).toBe(actions);
    expect(
      text.compareDocumentPosition(actions) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("defines a flat card border, radius, and padding with no box-shadow", () => {
    expect(sourceCss).toMatch(/border:\s*1px solid #e5e7eb/i);
    expect(sourceCss).toMatch(/border-radius:\s*8px/i);
    expect(sourceCss).toMatch(/padding:\s*12px 16px/i);
    expect(sourceCss).not.toMatch(/box-shadow/i);
  });

  it("styles the title at 16px/500 and the description at 14px with the secondary text token", () => {
    const titleRule = cssRule(sourceCss, ".task-row__title");
    const descriptionRule = cssRule(sourceCss, ".task-row__description");

    expect(titleRule).toMatch(/font-size:\s*16px/);
    expect(titleRule).toMatch(/font-weight:\s*500/);
    expect(descriptionRule).toMatch(/font-size:\s*14px/);
    expect(descriptionRule).toMatch(/color:\s*var\(--color-text-muted\)/);
  });

  it("resolves the --color-text, --color-text-muted, and --color-bg tokens the row relies on", () => {
    expect(tokensCss).toMatch(/--color-text\s*:\s*#[0-9a-f]{3,6}/i);
    expect(tokensCss).toMatch(/--color-text-muted\s*:\s*#[0-9a-f]{3,6}/i);
    expect(tokensCss).toMatch(/--color-bg\s*:\s*#[0-9a-f]{3,6}/i);
    expect(tokensCss).toMatch(/--space-1\s*:\s*4px/i);
    expect(tokensCss).toMatch(/--space-3\s*:\s*12px/i);
    expect(tokensCss).toMatch(/--touch-target-min\s*:\s*44px/i);
  });

  it("wraps a very long, space-less title inside the card instead of overflowing", () => {
    const longTitle = "x".repeat(200);
    const row = renderRow({ title: longTitle });
    expect(row.querySelector(".task-row__title").textContent).toBe(longTitle);

    const titleRule = cssRule(sourceCss, ".task-row__title");
    const textRule = cssRule(sourceCss, ".task-row__text");
    const actionsRule = cssRule(sourceCss, ".task-row__actions");

    expect(titleRule).toMatch(/overflow-wrap:\s*anywhere/);
    expect(titleRule).toMatch(/word-break:\s*break-word/);
    expect(textRule).toMatch(/min-width:\s*0/);
    expect(actionsRule).toMatch(/min-width:\s*var\(--touch-target-min\)/);
  });
});
