import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const dir = path.dirname(fileURLToPath(import.meta.url));
const tokensCss = readFileSync(path.join(dir, "tokens.css"), "utf-8");
const globalCss = readFileSync(path.join(dir, "global.css"), "utf-8");
const mainEntry = readFileSync(path.join(dir, "..", "main.jsx"), "utf-8");

function resolveVar(name, css) {
  const re = new RegExp(`${name}\\s*:\\s*([^;]+);`);
  const match = css.match(re);
  return match ? match[1].trim() : null;
}

function resolveToPx(value, css) {
  const varMatch = value.trim().match(/^var\((--[\w-]+)\)$/);
  if (varMatch) {
    return resolveVar(varMatch[1], css);
  }
  return value.trim();
}

// Extracts top-level (non-nested) CSS rules as { selectors: string[], body: string }
function extractRules(css) {
  const rules = [];
  const ruleRegex = /([^{}]+)\{([^{}]*)\}/g;
  let match;
  while ((match = ruleRegex.exec(css)) !== null) {
    const rawSelector = match[1].trim();
    if (rawSelector.startsWith("@")) continue;
    const selectors = rawSelector.split(",").map((s) => s.trim());
    rules.push({ selectors, body: match[2] });
  }
  return rules;
}

// A selector (e.g. "button") can appear in multiple separate rule blocks;
// merge their declarations so later/overriding rules are visible too.
function findRuleForSelector(rules, selector) {
  const matches = rules.filter((rule) => rule.selectors.includes(selector));
  if (matches.length === 0) return null;
  return { selectors: [selector], body: matches.map((r) => r.body).join(";") };
}

describe("design tokens (:root in tokens.css)", () => {
  const rootBlockMatch = tokensCss.match(/:root\s*\{([\s\S]*?)\n\}/);
  const rootBlock = rootBlockMatch ? rootBlockMatch[1] : "";

  it("defines a :root block", () => {
    expect(rootBlock.length).toBeGreaterThan(0);
  });

  it.each([
    "--color-bg",
    "--color-text",
    "--color-border",
    "--color-accent",
    "--color-error",
  ])("defines color variable %s under :root", (varName) => {
    expect(rootBlock).toMatch(new RegExp(`${varName}\\s*:`));
  });

  it("defines a spacing scale under :root", () => {
    const spacingVars = rootBlock.match(/--space-\d+\s*:/g) || [];
    expect(spacingVars.length).toBeGreaterThanOrEqual(2);
  });

  it("defines font size tokens under :root", () => {
    const fontSizeVars = rootBlock.match(/--font-size-[\w-]+\s*:/g) || [];
    expect(fontSizeVars.length).toBeGreaterThanOrEqual(2);
  });
});

describe("focus-visible outline", () => {
  it("defines a :focus-visible rule with a 2px outline", () => {
    const match = globalCss.match(/:focus-visible\s*\{([^}]*)\}/);
    expect(match).not.toBeNull();
    expect(match[1]).toMatch(/outline\s*:\s*2px\s+solid/);
  });
});

describe("prefers-reduced-motion handling", () => {
  it("contains an @media (prefers-reduced-motion: reduce) block", () => {
    const match = globalCss.match(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*?)\n\}\s*$/,
    );
    expect(match).not.toBeNull();
  });

  it("sets animation and transition durations to effectively zero inside that block", () => {
    const blockMatch = globalCss.match(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*)\}/,
    );
    expect(blockMatch).not.toBeNull();
    const block = blockMatch[1];
    const animationDuration = block.match(
      /animation-duration\s*:\s*([\d.]+)ms/,
    );
    const transitionDuration = block.match(
      /transition-duration\s*:\s*([\d.]+)ms/,
    );
    expect(animationDuration).not.toBeNull();
    expect(transitionDuration).not.toBeNull();
    expect(Number(animationDuration[1])).toBeLessThanOrEqual(1);
    expect(Number(transitionDuration[1])).toBeLessThanOrEqual(1);
  });
});

describe("44px minimum touch targets for interactive elements", () => {
  const rules = extractRules(globalCss);

  it.each(["button", "a", 'input:not([type="checkbox"]):not([type="radio"])'])(
    "the rule for selector %s sets min-height and min-width of 44px (via token)",
    (selector) => {
      const rule = findRuleForSelector(rules, selector);
      expect(rule).toBeTruthy();

      const minHeight = rule.body.match(/min-height\s*:\s*([^;]+);/);
      const minWidth = rule.body.match(/min-width\s*:\s*([^;]+);/);
      expect(minHeight).not.toBeNull();
      expect(minWidth).not.toBeNull();

      expect(resolveToPx(minHeight[1], tokensCss)).toBe("44px");
      expect(resolveToPx(minWidth[1], tokensCss)).toBe("44px");
    },
  );

  it("does not apply the 44px minimum size to checkbox/radio inputs", () => {
    const genericInputRule = findRuleForSelector(rules, "input");
    const hasUnscopedMinSize =
      genericInputRule && /min-(height|width)\s*:/.test(genericInputRule.body);
    expect(hasUnscopedMinSize).toBeFalsy();
  });
});

describe(".container layout", () => {
  it("sets max-width: 1100px (directly or via a token resolving to 1100px) and margin-inline: auto", () => {
    const match = globalCss.match(/\.container\s*\{([^}]*)\}/);
    expect(match).not.toBeNull();
    const declarations = match[1];

    const maxWidth = declarations.match(/max-width\s*:\s*([^;]+);/);
    expect(maxWidth).not.toBeNull();
    expect(resolveToPx(maxWidth[1], tokensCss)).toBe("1100px");

    expect(declarations).toMatch(/margin-inline\s*:\s*auto\s*;/);
  });
});

describe("entry file wiring", () => {
  it("main.jsx imports global.css", () => {
    expect(mainEntry).toMatch(/import\s+["'].*styles\/global\.css["']/);
  });

  it("page background resolves to white via --color-bg", () => {
    const bodyMatch = globalCss.match(/body\s*\{([^}]*)\}/);
    expect(bodyMatch).not.toBeNull();
    const bgMatch = bodyMatch[1].match(/background-color\s*:\s*([^;]+);/);
    expect(bgMatch).not.toBeNull();
    expect(resolveToPx(bgMatch[1], tokensCss).toLowerCase()).toBe("#ffffff");
  });
});
