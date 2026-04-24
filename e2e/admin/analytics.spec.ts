import { test, expect } from "@playwright/test";
import { LoginPom } from "../poms/LoginPom";
import { AdminShellPom } from "../poms/AdminShellPom";

const EMAIL = process.env.E2E_ADMIN_EMAIL || "demo-admin@vera-eval.app";
const PASSWORD = process.env.E2E_ADMIN_PASSWORD || "";

test.describe("analytics page", () => {
  test.describe.configure({ mode: "serial" });

  async function signInAndGoto(
    page: Parameters<Parameters<typeof test>[1]>[0]["page"],
  ) {
    await page.addInitScript(() => {
      try {
        localStorage.setItem("vera.admin_tour_done", "1");
        localStorage.setItem("admin.remember_me", "true");
      } catch {}
    });
    const login = new LoginPom(page);
    const shell = new AdminShellPom(page);
    await login.goto();
    await login.signIn(EMAIL, PASSWORD);
    await shell.expectOnDashboard();
    await page.goto("/admin/analytics");
    return shell;
  }

  test("page renders — chart container visible", async ({ page }) => {
    await signInAndGoto(page);
    await expect(page.locator('[data-testid="analytics-chart-container"]')).toBeVisible();
  });

  test("nav item navigates to analytics", async ({ page }) => {
    const shell = await signInAndGoto(page);
    await expect(shell.navItem("analytics")).toBeVisible();
    await expect(page).toHaveURL(/analytics/);
  });
});
