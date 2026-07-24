import { test, expect } from "@playwright/test";

test("creates and settles the sample purchase request", async ({ page }) => {
  await page.goto("/purchase-requests/new");
  await page.getByRole("button", { name: "Create and execute request" }).click();

  await expect(page.getByRole("heading", { name: "Procurement workflow result" })).toBeVisible();
  await expect(page.getByText("Nova Compute", { exact: true }).first()).toBeVisible();

  const deliveryCard = page.getByText("Delivery", { exact: true }).locator("..");
  await expect(deliveryCard.getByText("VERIFIED", { exact: true })).toBeVisible();

  const clearingCard = page.getByText("Clearing scenario", { exact: true }).locator("..");
  await expect(clearingCard.getByText("DELIVERED", { exact: true })).toBeVisible();
});
