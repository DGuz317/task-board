import { test, expect } from "@playwright/test";

test("renders the page header at /", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("banner").getByRole("heading", { name: "Task Board" }),
  ).toBeVisible();
});

test("shows the not-found message on an unknown route", async ({ page }) => {
  await page.goto("/this-route-does-not-exist");
  await expect(
    page.getByRole("heading", { name: "Page not found" }),
  ).toBeVisible();
  await expect(
    page.getByText("We couldn't find the page you're looking for."),
  ).toBeVisible();
});
