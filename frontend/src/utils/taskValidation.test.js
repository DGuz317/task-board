import { describe, expect, it } from "vitest";
import {
  TITLE_MAX,
  DESCRIPTION_MAX,
  validateTask,
  normalizeTask,
} from "./taskValidation.js";

describe("validateTask", () => {
  it("requires a title when empty", () => {
    expect(validateTask({ title: "", description: "" }).title).toBe(
      "Title is required",
    );
  });

  it("requires a title when whitespace-only", () => {
    expect(validateTask({ title: "   " }).title).toBe("Title is required");
  });

  it("requires a title when values are missing entirely", () => {
    expect(validateTask().title).toBe("Title is required");
    expect(validateTask({}).title).toBe("Title is required");
  });

  it("accepts a title of exactly the max length and rejects one over", () => {
    expect(
      validateTask({ title: "a".repeat(TITLE_MAX) }).title,
    ).toBeUndefined();
    expect(validateTask({ title: "a".repeat(TITLE_MAX + 1) }).title).toBe(
      `Title must be ${TITLE_MAX} characters or fewer`,
    );
  });

  it("measures the title length after trimming", () => {
    const padded = `  ${"a".repeat(TITLE_MAX)}  `;
    expect(validateTask({ title: padded }).title).toBeUndefined();
  });

  it("accepts a description of exactly the max length and rejects one over", () => {
    expect(
      validateTask({ title: "x", description: "a".repeat(DESCRIPTION_MAX) })
        .description,
    ).toBeUndefined();
    expect(
      validateTask({
        title: "x",
        description: "a".repeat(DESCRIPTION_MAX + 1),
      }).description,
    ).toBe(`Description must be ${DESCRIPTION_MAX} characters or fewer`);
  });

  it("treats a missing description as valid", () => {
    expect(validateTask({ title: "x" }).description).toBeUndefined();
  });

  it("returns an empty errors object for fully valid input", () => {
    expect(
      validateTask({ title: "Buy milk", description: "Whole milk" }),
    ).toEqual({});
  });
});

describe("normalizeTask", () => {
  it("trims the title and leaves the description untouched", () => {
    expect(normalizeTask({ title: "  Hello  ", description: "x" })).toEqual({
      title: "Hello",
      description: "x",
    });
  });

  it("defaults to empty strings when values are missing", () => {
    expect(normalizeTask()).toEqual({ title: "", description: "" });
    expect(normalizeTask({ title: "Only title" })).toEqual({
      title: "Only title",
      description: "",
    });
  });
});
