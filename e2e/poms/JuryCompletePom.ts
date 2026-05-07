import type { Locator } from "@playwright/test";
import { expect } from "@playwright/test";
import { BasePom } from "./BasePom";

export class JuryCompletePom extends BasePom {
  heading(): Locator {
    return this.byTestId("jury-complete-heading");
  }

  async waitForCompleteStep(): Promise<void> {
    await this.page.waitForURL(/\/demo\/jury\/complete/);
    await expect(this.heading()).toBeVisible({ timeout: 15_000 });
  }

  async expectCompletionScreen(): Promise<void> {
    await expect(this.heading()).toBeVisible();
  }
}
