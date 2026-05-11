import { test, expect } from "@playwright/test";
import { LoginPom } from "../poms/LoginPom";
import { AdminShellPom } from "../poms/AdminShellPom";

const TENANT_EMAIL = process.env.E2E_TENANT_ADMIN_EMAIL || "tenant-admin@vera-eval.app";
const TENANT_PASSWORD = process.env.E2E_TENANT_ADMIN_PASSWORD || "TenantAdmin2026!";
const E2E_ORG_ID = "b2c3d4e5-f6a7-8901-bcde-f12345678901";

// Override the project-level admin storageState — this spec must sign in as the
// tenant admin, not inherit the pre-authenticated super-admin session. Without
// this, the super-admin storageState auto-redirects /login → /admin before the
// form renders (especially fast after rpc_admin_bootstrap landed), LoginPom's
// signIn becomes a no-op, and the test silently runs as super admin.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("tenant-admin role", () => {
  test("org_admin can sign in and sees restricted nav", async ({ page }) => {
    await page.addInitScript((orgId) => {
      try {
        localStorage.setItem("vera.admin_tour_done", "1");
        localStorage.setItem("admin.remember_me", "true");
        localStorage.setItem("admin.active_organization_id", orgId);
      } catch {}
    }, E2E_ORG_ID);

    const login = new LoginPom(page);
    const shell = new AdminShellPom(page);

    await login.goto();
    await login.signIn(TENANT_EMAIL, TENANT_PASSWORD);

    // Dashboard loads
    await shell.expectOnDashboard();

    // Organizations nav is hidden (super-admin only)
    await shell.expectOrganizationsNavHidden();

    // Can navigate to a regular page
    await shell.clickNav("periods");
    await expect(page).toHaveURL(/periods/);
  });
});
