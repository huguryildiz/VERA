import { test, expect } from "@playwright/test";

// JuryGuard checks jury_access_period from sessionStorage → localStorage.
// Clearing both before navigation causes the guard to redirect to /demo/eval.

test.describe("jury expired session", () => {
  test("cleared jury storage redirects to eval gate", async ({ page }) => {
    await page.addInitScript(() => {
      try {
        sessionStorage.removeItem("jury_access_period");
        localStorage.removeItem("jury_access_period");
        sessionStorage.removeItem("jury_access_grant");
        localStorage.removeItem("jury_access_grant");
      } catch {}
    });

    await page.goto("/demo/jury/evaluate");

    await expect(page).toHaveURL(/\/demo\/eval/, { timeout: 10_000 });
    await expect(page.locator('[data-testid="jury-token-input"]')).toBeVisible();
  });

  test("cleared jury storage on /demo/jury/pin redirects to eval gate", async ({ page }) => {
    await page.addInitScript(() => {
      try {
        sessionStorage.removeItem("jury_access_period");
        localStorage.removeItem("jury_access_period");
        sessionStorage.removeItem("jury_access_grant");
        localStorage.removeItem("jury_access_grant");
      } catch {}
    });

    await page.goto("/demo/jury/pin");

    await expect(page).toHaveURL(/\/demo\/eval/, { timeout: 10_000 });
    await expect(page.locator('[data-testid="jury-token-input"]')).toBeVisible();
  });
});
