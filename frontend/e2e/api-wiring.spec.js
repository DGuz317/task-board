import { test, expect } from "@playwright/test";
import { API_BASE_URL } from "./env.js";

test("browser-side fetch from the frontend origin reaches the backend health endpoint", async ({
  page,
}) => {
  await page.goto("/");

  // A real cross-origin fetch (frontend origin -> backend origin): if CORS
  // didn't match FRONTEND_ORIGIN exactly, the browser would reject this
  // before the page ever saw a response.
  const result = await page.evaluate(async (apiBase) => {
    const response = await fetch(`${apiBase}/health`);
    return { status: response.status, body: await response.json() };
  }, API_BASE_URL);

  expect(result.status).toBe(200);
  expect(result.body).toEqual({ status: "ok" });
});
