import { test, expect } from "@playwright/test";

test("creates and settles the sample purchase request", async ({ page }) => {
  await page.goto("/purchase-requests/new");
  await page.getByRole("button", { name: "Create and execute request" }).click();
  await expect(page.getByRole("heading", { name: "Procurement workflow result" })).toBeVisible();
  await expect(page.getByText("Nova Compute", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("DELIVERED", { exact: true })).toBeVisible();
  await expect(page.getByText("VERIFIED", { exact: true })).toBeVisible();
});
