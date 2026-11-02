import { describe, expect, it } from "vitest";
import { TITLE_MAX, DESCRIPTION_MAX, validateTask } from "./validateTask";

describe("validateTask", () => {
  it("requires a title when empty", () => {
    const result = validateTask({ title: "", description: "" });
    expect(result.errors.title).toBe("Title is required");
    expect(result.isValid).toBe(false);
  });

  it("requires a title when whitespace-only", () => {
    const result = validateTask({ title: "   ", description: "" });
    expect(result.errors.title).toBe("Title is required");
    expect(result.isValid).toBe(false);
  });

  it("requires a title when missing entirely", () => {
    const result = validateTask({});
    expect(result.errors.title).toBe("Title is required");
    expect(result.values.title).toBe("");
  });

  it("trims surrounding whitespace from the title", () => {
    const result = validateTask({ title: "  Buy milk  " });
    expect(result.values.title).toBe("Buy milk");
    expect(result.errors.title).toBeUndefined();
  });

  it("accepts a title of exactly the max length", () => {
    const title = "a".repeat(TITLE_MAX);
    const result = validateTask({ title });
    expect(result.errors.title).toBeUndefined();
    expect(result.isValid).toBe(true);
  });

  it("rejects a title one character over the max length", () => {
    const title = "a".repeat(TITLE_MAX + 1);
    const result = validateTask({ title });
    expect(result.errors.title).toBe("Title must be 100 characters or fewer");
    expect(result.isValid).toBe(false);
  });

  it("trims before measuring length so padded titles at the limit stay valid", () => {
    const title = `  ${"a".repeat(TITLE_MAX)}  `;
    const result = validateTask({ title });
    expect(result.errors.title).toBeUndefined();
    expect(result.values.title).toBe("a".repeat(TITLE_MAX));
  });

  it("accepts a description of exactly the max length", () => {
    const description = "a".repeat(DESCRIPTION_MAX);
    const result = validateTask({ title: "Buy milk", description });
    expect(result.errors.description).toBeUndefined();
    expect(result.isValid).toBe(true);
  });

  it("rejects a description one character over the max length", () => {
    const description = "a".repeat(DESCRIPTION_MAX + 1);
    const result = validateTask({ title: "Buy milk", description });
    expect(result.errors.description).toBe(
      "Description must be 500 characters or fewer",
    );
    expect(result.isValid).toBe(false);
  });

  it("treats a missing description as valid", () => {
    const result = validateTask({ title: "Buy milk" });
    expect(result.errors.description).toBeUndefined();
    expect(result.values.description).toBe("");
    expect(result.isValid).toBe(true);
  });

  it("treats an empty or whitespace-only description as valid", () => {
    expect(
      validateTask({ title: "Buy milk", description: "" }).errors.description,
    ).toBeUndefined();
    const whitespaceResult = validateTask({
      title: "Buy milk",
      description: "   ",
    });
    expect(whitespaceResult.errors.description).toBeUndefined();
    expect(whitespaceResult.values.description).toBe("");
  });

  it("returns isValid true and an empty errors object for fully valid input", () => {
    const result = validateTask({
      title: "Buy milk",
      description: "Whole milk",
    });
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it("reports both field errors simultaneously when both are invalid", () => {
    const result = validateTask({
      title: "",
      description: "a".repeat(DESCRIPTION_MAX + 1),
    });
    expect(result.errors.title).toBe("Title is required");
    expect(result.errors.description).toBe(
      "Description must be 500 characters or fewer",
    );
    expect(result.isValid).toBe(false);
  });

  it("does not mutate the input object", () => {
    const input = { title: "  Buy milk  ", description: "  Whole milk  " };
    const frozen = { ...input };
    validateTask(input);
    expect(input).toEqual(frozen);
  });
});
