import { describe, expect, it } from "vitest";
import { ESLint } from "eslint";
import config from "../../eslint.config.js";

function findReactHooksEntry() {
  return config.find((entry) => entry.plugins && entry.plugins["react-hooks"]);
}

describe("eslint.config.js", () => {
  it("registers eslint-plugin-react-hooks", () => {
    const entry = findReactHooksEntry();
    expect(entry).toBeTruthy();
    expect(entry.plugins["react-hooks"]).toBeTruthy();
  });

  it("enables react-hooks/rules-of-hooks as an error", () => {
    const entry = findReactHooksEntry();
    expect(entry.rules["react-hooks/rules-of-hooks"]).toBe("error");
  });

  it("reports a rules-of-hooks violation for a conditionally called hook", async () => {
    const eslint = new ESLint({
      overrideConfigFile: true,
      baseConfig: config,
      cwd: process.cwd(),
    });

    const source = [
      "import { useState } from 'react';",
      "function Widget({ condition }) {",
      "  if (condition) {",
      "    useState(0);",
      "  }",
      "  return null;",
      "}",
      "export default Widget;",
      "",
    ].join("\n");

    const [result] = await eslint.lintText(source, { filePath: "Widget.jsx" });
    const ruleIds = result.messages.map((message) => message.ruleId);

    expect(ruleIds).toContain("react-hooks/rules-of-hooks");
  });

  it("does not flag a hook called unconditionally at the top of a component", async () => {
    const eslint = new ESLint({
      overrideConfigFile: true,
      baseConfig: config,
      cwd: process.cwd(),
    });

    const source = [
      "import { useState } from 'react';",
      "function Widget() {",
      "  const [value] = useState(0);",
      "  return value;",
      "}",
      "export default Widget;",
      "",
    ].join("\n");

    const [result] = await eslint.lintText(source, { filePath: "Widget.jsx" });
    const ruleIds = result.messages.map((message) => message.ruleId);

    expect(ruleIds).not.toContain("react-hooks/rules-of-hooks");
  });
});
