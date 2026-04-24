import { test, expect } from "@playwright/test";
import { buildAdminSession, getStorageKey } from "../helpers/oauthSession";
import { AdminShellPom } from "../poms/AdminShellPom";
import { E2E_PERIODS_ORG_ID } from "../fixtures/seed-ids";

// Tenant-admin credentials are hardcoded (same as tenant-isolation.spec.ts)
// so this test works without additional env-var setup.
const TENANT_EMAIL = "tenant-admin@vera-eval.app";
const TENANT_PASSWORD = "TenantAdmin2026!";

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

// ─────────────────────────────────────────────────────────────────────────────
// Session-injection tests
//
// Simulates the post-OAuth state: a valid Supabase session is already in
// localStorage (as the SDK would store it after a real OAuth callback).
// Verifies that the admin shell mounts when the session is valid, and that
// the user is redirected to login when the session is expired/invalid.
// ─────────────────────────────────────────────────────────────────────────────

test.describe("session-injection OAuth flow", () => {
  test("injected valid Supabase session renders admin shell at /demo/admin/overview", async ({ page }) => {
    const { storageKey, sessionValue } = await buildAdminSession(TENANT_EMAIL, TENANT_PASSWORD);

    await page.addInitScript(
      ({ key, value, orgId }: { key: string; value: unknown; orgId: string }) => {
        try {
          window.localStorage.setItem("vera.admin_tour_done", "1");
          window.localStorage.setItem("admin.active_organization_id", orgId);
          window.localStorage.setItem(key, JSON.stringify(value));
        } catch {}
      },
      { key: storageKey, value: sessionValue, orgId: E2E_PERIODS_ORG_ID },
    );

    await page.goto("/demo/admin/overview");

    const shell = new AdminShellPom(page);
    await shell.expectOnDashboard();
  });

  // ── Deliberately-break evidence ────────────────────────────────────────────
  // Injects a structurally-valid session object whose access_token is expired
  // (expires_at = 1) and whose refresh_token is bogus. The Supabase JS client
  // detects the expired session, attempts a refresh, gets a 400 from Supabase
  // Auth, fires SIGNED_OUT, and the AuthGuard redirects to login.
  test("deliberately-break: expired injected session redirects to login", async ({ page }) => {
    const storageKey = getStorageKey();

    const expiredSession = {
      // JWT header.payload.sig — payload has sub=00...00 and exp=1 (epoch 1970)
      access_token:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" +
        ".eyJzdWIiOiIwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDAiLCJleHAiOjF9" +
        ".AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      token_type: "bearer",
      expires_in: 3600,
      refresh_token: "invalid-refresh-token-for-e2e-break-test",
      expires_at: 1,
      user: { id: "00000000-0000-0000-0000-000000000000" },
    };

    await page.addInitScript(
      ({ key, value }: { key: string; value: unknown }) => {
        try {
          window.localStorage.setItem(key, JSON.stringify(value));
        } catch {}
      },
      { key: storageKey, value: expiredSession },
    );

    await page.goto("/demo/admin/overview");

    // Supabase JS detects the expired session, fails the refresh, signs out,
    // and the AuthGuard kicks the user out of /demo/admin/*.
    // On demo routes, AuthGuard redirects to /demo (not /login) so
    // DemoAdminLoader can attempt auto-login again.
    await page.waitForURL((url) => !url.pathname.includes("/admin"), { timeout: 15_000 });
  });
});
