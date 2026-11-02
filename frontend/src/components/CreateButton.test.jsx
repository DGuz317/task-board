import { createRef } from "react";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import CreateButton from "./CreateButton.jsx";

const here = dirname(fileURLToPath(import.meta.url));
const sourceCss = readFileSync(join(here, "CreateButton.css"), "utf-8");
const tokensCss = readFileSync(
  join(here, "..", "styles", "tokens.css"),
  "utf-8",
);

function resolveVar(name) {
  const match = tokensCss.match(new RegExp(`${name}\\s*:\\s*([^;]+);`));
  return match ? match[1].trim() : null;
}

function resolveToValue(value) {
  const varMatch = value?.trim().match(/^var\((--[\w-]+)\)$/);
  return varMatch ? resolveVar(varMatch[1]) : value?.trim();
}

function ruleFor(selector) {
  const match = sourceCss.match(new RegExp(`\\.${selector}\\s*\\{([^}]*)\\}`));
  return match ? match[1] : "";
}

describe("CreateButton", () => {
  it("renders a native button labelled Create", () => {
    render(<CreateButton onClick={() => {}} />);

    const button = screen.getByRole("button", { name: "Create" });
    expect(button.tagName).toBe("BUTTON");
    expect(button).toHaveAttribute("type", "button");
  });

  it("forwards the ref to the underlying button element", () => {
    const ref = createRef();
    render(<CreateButton ref={ref} onClick={() => {}} />);

    expect(ref.current).toBe(screen.getByRole("button", { name: "Create" }));
  });

  it("calls onClick exactly once when clicked", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<CreateButton onClick={onClick} />);

    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("resolves to #2563EB background, white text, 8px radius, and 40px height", () => {
    const rule = ruleFor("create-button");

    const background = rule.match(/background\s*:\s*([^;]+);/)?.[1];
    const color = rule.match(/color\s*:\s*([^;]+);/)?.[1];
    const radius = rule.match(/border-radius\s*:\s*([^;]+);/)?.[1];
    const height = rule.match(/height\s*:\s*([^;]+);/)?.[1];
    const minHeight = rule.match(/min-height\s*:\s*([^;]+);/)?.[1];

    expect(resolveToValue(background)).toBe("#2563eb");
    expect(resolveToValue(color)).toBe("#ffffff");
    expect(resolveToValue(radius)).toBe("8px");
    expect(resolveToValue(height)).toBe("40px");
    expect(resolveToValue(minHeight)).toBe("40px");
  });
});
