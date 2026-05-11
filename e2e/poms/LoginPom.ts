import type { Locator } from "@playwright/test";
import { expect } from "@playwright/test";
import { BasePom } from "./BasePom";

export class LoginPom extends BasePom {
  async goto(): Promise<void> {
    await super.goto("/login");
    // storageState may pre-authenticate the browser; /login then redirects to /admin.
    // Wait for whichever state arrives first.
    await Promise.race([
      this.emailInput().waitFor({ state: "visible", timeout: 15_000 }),
      this.page.waitForURL(/\/admin/, { timeout: 15_000 }),
    ]);
    // The email input may become visible briefly while an auth bootstrap RPC
    // (getAdminBootstrap) is still in-flight. When that RPC resolves, the
    // AuthProvider fires navigate("/admin"), detaching the form mid-fill.
    // Guard: if the race resolved via emailInput but a redirect is still pending,
    // wait up to 10 s for it to fire so signIn() sees a stable state.
    if (!/\/admin/.test(this.page.url())) {
      await this.page.waitForURL(/\/admin/, { timeout: 10_000 }).catch(() => {});
    }
  }

  emailInput(): Locator {
    return this.byTestId("admin-login-email");
  }

  passwordInput(): Locator {
    return this.byTestId("admin-login-password");
  }

  submitButton(): Locator {
    return this.byTestId("admin-login-submit");
  }

  errorBanner(): Locator {
    return this.byTestId("admin-login-error");
  }

  async fillEmail(value: string): Promise<void> {
    // Short timeout so a detached element fails fast (→ caught in signIn()).
    await this.emailInput().fill(value, { timeout: 5_000 });
  }

  async fillPassword(value: string): Promise<void> {
    await this.passwordInput().fill(value);
  }

  async submit(): Promise<void> {
    try {
      await this.submitButton().click();
    } catch (error) {
      // storageState can restore while /login is still rendering; the form then
      // redirects to /admin and Playwright may see the submit button detach.
      if (/\/admin/.test(this.page.url())) return;
      try {
        await this.page.waitForURL(/\/admin/, { timeout: 5_000 });
        return;
      } catch {}
      throw error;
    }
  }

  async signIn(email: string, password: string): Promise<void> {
    // No-op when storageState already redirected us away from /login.
    if (!(await this.emailInput().isVisible())) return;
    try {
      await this.fillEmail(email);
    } catch (error) {
      // storageState can restore while fillEmail is in progress; the form then
      // redirects to /admin and Playwright sees the email input detach.
      if (/\/admin/.test(this.page.url())) return;
      try {
        await this.page.waitForURL(/\/admin/, { timeout: 5_000 });
        return;
      } catch {}
      throw error;
    }
    // Re-check after filling email: a delayed auth redirect (bootstrap RPC
    // completing) may fire during the fill and navigate away from /login.
    if (!/\/login/.test(this.page.url())) return;
    await this.fillPassword(password);
    await this.submit();
  }

  async expectErrorMessage(pattern?: RegExp): Promise<void> {
    const banner = this.errorBanner();
    await expect(banner).toBeVisible();
    if (pattern) {
      await expect(banner).toHaveText(pattern);
    }
  }
}
