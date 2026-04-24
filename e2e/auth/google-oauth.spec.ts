import { test, expect } from "@playwright/test";

// Intercept the OAuth redirect so the test doesn't actually hit Google.
// We verify that clicking the Google button initiates the OAuth flow
// (navigates to the Supabase /auth/v1/authorize endpoint with provider=google).

test.describe("Google OAuth login", () => {
  test("clicking Google login button initiates OAuth redirect with provider=google", async ({ page }) => {
    let oauthUrl = "";

    await page.route("**/auth/v1/authorize**", async (route) => {
      oauthUrl = route.request().url();
      // Abort the real redirect — we just want to capture the URL.
      await route.abort();
    });

    await page.goto("/demo/login");
    await expect(page.locator('[data-testid="admin-login-google"]')).toBeVisible({ timeout: 10_000 });
    await page.locator('[data-testid="admin-login-google"]').click();

    // Give the route handler time to fire.
    await page.waitForTimeout(2_000);

    expect(oauthUrl).toContain("provider=google");
  });
});
