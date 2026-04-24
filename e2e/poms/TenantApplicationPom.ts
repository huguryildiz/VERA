import type { Locator } from "@playwright/test";
import { expect } from "@playwright/test";
import { BasePom } from "./BasePom";

export class TenantApplicationPom extends BasePom {
  pendingList(): Locator {
    return this.byTestId("org-pending-list");
  }

  approveBtn(applicationId: string): Locator {
    return this.byTestId(`org-approve-btn-${applicationId}`);
  }

  rejectBtn(applicationId: string): Locator {
    return this.byTestId(`org-reject-btn-${applicationId}`);
  }

  approvedBadge(): Locator {
    return this.byTestId("org-approved-badge");
  }

  rejectedBadge(): Locator {
    return this.byTestId("org-rejected-badge");
  }

  async waitForPendingList(): Promise<void> {
    await expect(this.pendingList()).toBeVisible({ timeout: 10_000 });
  }

  async approveApplication(applicationId: string): Promise<void> {
    await this.approveBtn(applicationId).click();
    await expect(this.approvedBadge()).toBeVisible({ timeout: 10_000 });
  }

  async rejectApplication(applicationId: string): Promise<void> {
    await this.rejectBtn(applicationId).click();
    await expect(this.rejectedBadge()).toBeVisible({ timeout: 10_000 });
  }
}
