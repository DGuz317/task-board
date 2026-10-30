import { defineConfig, devices } from "@playwright/test";
import {
  API_BASE_URL,
  BACKEND_HEALTH_URL,
  BACKEND_PORT,
  FRONTEND_PORT,
  FRONTEND_URL,
} from "./e2e/env.js";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: FRONTEND_URL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: `python -m uvicorn backend.app.main:app --port ${BACKEND_PORT}`,
      cwd: "..",
      url: BACKEND_HEALTH_URL,
      env: { FRONTEND_ORIGIN: FRONTEND_URL },
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: `npm run dev -- --port ${FRONTEND_PORT} --strictPort`,
      url: FRONTEND_URL,
      env: { VITE_API_BASE_URL: API_BASE_URL },
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
