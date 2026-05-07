import type { Locator } from "@playwright/test";
import { expect } from "@playwright/test";
import { BasePom } from "./BasePom";

export class OrgsPom extends BasePom {
  async waitForReady(): Promise<void> {
    await expect(this.createBtn()).toBeVisible();
  }

  createBtn(): Locator {
    return this.byTestId("orgs-create-btn");
  }

  // Create drawer
  drawerName(): Locator { return this.byTestId("orgs-drawer-name"); }
  drawerCode(): Locator { return this.byTestId("orgs-drawer-code"); }
  drawerContactEmail(): Locator { return this.byTestId("orgs-drawer-contact-email"); }
  drawerError(): Locator { return this.byTestId("orgs-drawer-error"); }
  drawerSave(): Locator { return this.byTestId("orgs-drawer-save"); }
  drawerCancel(): Locator { return this.byTestId("orgs-drawer-cancel"); }

  // Edit drawer
  editDrawerName(): Locator { return this.byTestId("orgs-edit-drawer-name"); }
  editDrawerContactEmail(): Locator { return this.byTestId("orgs-edit-drawer-contact-email"); }
  editDrawerError(): Locator { return this.byTestId("orgs-edit-drawer-error"); }
  editDrawerSave(): Locator { return this.byTestId("orgs-edit-drawer-save"); }
  editDrawerCancel(): Locator { return this.byTestId("orgs-edit-drawer-cancel"); }

  // Delete modal
  deleteCodeInput(): Locator { return this.byTestId("orgs-delete-code-input"); }
  deleteCancel(): Locator { return this.byTestId("orgs-delete-cancel"); }
  deleteConfirm(): Locator { return this.byTestId("orgs-delete-confirm"); }

  private async orgIdForRow(name: string): Promise<string> {
    const row = this.page.locator("tr").filter({ hasText: name });
    const kebab = row.locator("[data-testid^='orgs-row-kebab-']");
    const testid = await kebab.getAttribute("data-testid");
    return testid!.replace("orgs-row-kebab-", "");
  }

  async openCreateDrawer(): Promise<void> {
    await this.createBtn().click();
    await expect(this.drawerName()).toBeVisible();
  }

  async fillCreateForm(name: string, code: string, email: string): Promise<void> {
    await this.drawerName().fill(name);
    await this.drawerCode().fill(code);
    await this.drawerContactEmail().fill(email);
  }

  async saveCreate(): Promise<void> {
    await this.drawerSave().click();
    await expect(this.drawerSave()).not.toBeVisible({ timeout: 10000 });
  }

  async clickEditForOrg(name: string): Promise<void> {
    const id = await this.orgIdForRow(name);
    await this.page.locator("tr").filter({ hasText: name }).locator("[data-testid^='orgs-row-kebab-']").click();
    await this.byTestId(`orgs-row-edit-${id}`).click();
  }

  async clickDeleteForOrg(name: string): Promise<void> {
    const id = await this.orgIdForRow(name);
    await this.page.locator("tr").filter({ hasText: name }).locator("[data-testid^='orgs-row-kebab-']").click();
    await this.byTestId(`orgs-row-delete-${id}`).click();
  }

  async fillEditName(name: string): Promise<void> {
    const input = this.editDrawerName();
    await input.clear();
    await input.fill(name);
  }

  async saveEdit(): Promise<void> {
    await this.editDrawerSave().click();
    await expect(this.editDrawerSave()).not.toBeVisible({ timeout: 10000 });
  }

  async confirmDelete(code: string): Promise<void> {
    await this.deleteCodeInput().fill(code);
    await this.deleteConfirm().click();
  }

  async expectOrgRowVisible(name: string): Promise<void> {
    await expect(this.page.locator("tr").filter({ hasText: name })).toBeVisible();
  }

  async expectOrgRowGone(name: string): Promise<void> {
    await expect(this.page.locator("tr").filter({ hasText: name })).not.toBeVisible();
  }
}
