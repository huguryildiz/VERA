import type { Locator } from "@playwright/test";
import { expect } from "@playwright/test";
import { BasePom } from "./BasePom";

export class DemoPom extends BasePom {
  loader(): Locator {
    return this.byTestId("demo-admin-shell");
  }

  adminShell(): Locator {
    return this.byTestId("admin-shell-root");
  }

  sidebar(): Locator {
    return this.byTestId("admin-shell-sidebar");
  }

  navItem(key: string): Locator {
    return this.byTestId(`admin-shell-nav-${key}`);
  }

  async goto(): Promise<void> {
    await this.page.goto("/demo");
  }

  async expectAdminShell(): Promise<void> {
    await this.page.waitForURL(/\/demo\/admin/);
    await expect(this.adminShell()).toBeVisible({ timeout: 20_000 });
    await expect(this.sidebar()).toBeVisible();
  }
}
