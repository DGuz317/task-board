import { test, expect } from "@playwright/test";
import { API_BASE_URL } from "./env.js";

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

test("shows tasks created via the API inside the list region, in creation order, after a full reload", async ({
  page,
  request,
}) => {
  const stamp = Date.now();
  const titles = [
    `E2E Alpha ${stamp}`,
    `E2E Beta ${stamp}`,
    `E2E Gamma ${stamp}`,
  ];
  const createdIds = [];

  try {
    for (const title of titles) {
      const response = await request.post(`${API_BASE_URL}/tasks`, {
        data: { title },
      });
      expect(response.ok()).toBeTruthy();
      createdIds.push((await response.json()).id);
    }

    await page.goto("/");
    await page.reload();

    const listRegion = page.getByTestId("task-list-region");
    await expect(listRegion.getByText(titles[2])).toBeVisible();

    const titleTexts = await listRegion
      .locator(".task-row__title")
      .allTextContents();
    const indices = titles.map((title) => titleTexts.indexOf(title));

    expect(indices).not.toContain(-1);
    expect(indices).toEqual([...indices].sort((a, b) => a - b));
  } finally {
    await Promise.all(
      createdIds.map((id) => request.delete(`${API_BASE_URL}/tasks/${id}`)),
    );
  }
});
