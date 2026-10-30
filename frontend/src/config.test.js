import { describe, expect, it, vi, beforeEach } from "vitest";
import { normalizeBaseUrl } from "./config.js";

describe("normalizeBaseUrl", () => {
  it("strips a single trailing slash", () => {
    expect(normalizeBaseUrl("http://localhost:8000/api/")).toBe(
      "http://localhost:8000/api",
    );
  });

  it("strips multiple trailing slashes", () => {
    expect(normalizeBaseUrl("http://localhost:8000/api///")).toBe(
      "http://localhost:8000/api",
    );
  });

  it("leaves a value without a trailing slash unchanged", () => {
    expect(normalizeBaseUrl("http://localhost:8000/api")).toBe(
      "http://localhost:8000/api",
    );
  });

  it("falls back to the default when given an empty string", () => {
    expect(normalizeBaseUrl("")).toBe("http://localhost:8000/api");
  });

  it("falls back to the default when given undefined", () => {
    expect(normalizeBaseUrl(undefined)).toBe("http://localhost:8000/api");
  });
});

describe("API_BASE_URL module export", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("derives from import.meta.env.VITE_API_BASE_URL with trailing slashes removed", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "http://localhost:8000/api/");
    const { API_BASE_URL } = await import("./config.js");
    expect(API_BASE_URL).toBe("http://localhost:8000/api");
  });

  it("falls back to the default when VITE_API_BASE_URL is unset", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "");
    const { API_BASE_URL } = await import("./config.js");
    expect(API_BASE_URL).toBe("http://localhost:8000/api");
  });
});
