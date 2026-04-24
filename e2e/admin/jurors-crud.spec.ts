import { test, expect } from "@playwright/test";
import { LoginPom } from "../poms/LoginPom";
import { AdminShellPom } from "../poms/AdminShellPom";
import { JurorsPom } from "../poms/JurorsPom";

const EMAIL = process.env.E2E_ADMIN_EMAIL || "demo-admin@vera-eval.app";
const PASSWORD = process.env.E2E_ADMIN_PASSWORD || "";

// Unique suffix prevents collision with the backend's
// UNIQUE(organization_id, juror_name, affiliation) constraint when a previous
// run left residue behind. Bump in the spec if you ever run tests in parallel.
const SUFFIX = "B3E2E";
const JUROR_NAME = `Prof. B3 E2E Juror ${SUFFIX}`;
const JUROR_AFFIL = `E2E University ${SUFFIX}`;
const JUROR_EMAIL = `b3juror-${SUFFIX.toLowerCase()}@e2e.local`;
const JUROR_NAME_EDITED = `Prof. B3 E2E Juror ${SUFFIX} — Edited`;

test.describe("jurors crud", () => {
  test.describe.configure({ mode: "serial" });

  async function signInAndGotoJurors(page: Parameters<Parameters<typeof test>[1]>[0]["page"]) {
    // Suppress the guided tour + enable remember_me so the Supabase session
    // persists past AuthProvider's post-login clearPersistedSession hook.
    // Point to the dedicated E2E org (has a single unlocked period) so the
    // period_locked trigger never fires during juror CRUD.
    await page.addInitScript(() => {
      try {
        localStorage.setItem("vera.admin_tour_done", "1");
        localStorage.setItem("admin.remember_me", "true");
        localStorage.setItem(
          "admin.active_organization_id",
          "f7340e37-9349-4210-8d6b-073a5616bf49",
        );
      } catch {}
    });
    const login = new LoginPom(page);
    const shell = new AdminShellPom(page);
    const jurors = new JurorsPom(page);
    await login.goto();
    await login.signIn(EMAIL, PASSWORD);
    await shell.expectOnDashboard();
    await shell.clickNav("jurors");
    await jurors.waitForReady();
    return jurors;
  }

  test("create — new juror appears in the table", async ({ page }) => {
    const jurors = await signInAndGotoJurors(page);
    await jurors.openCreateDrawer();
    await jurors.fillCreateForm(JUROR_NAME, JUROR_AFFIL, JUROR_EMAIL);
    await jurors.saveCreate();
    await jurors.expectJurorRowVisible(JUROR_NAME);
  });

  test("edit — update juror name reflects in the table", async ({ page }) => {
    const jurors = await signInAndGotoJurors(page);
    await jurors.clickEditForJuror(JUROR_NAME);
    await expect(jurors.editDrawerName()).toBeVisible();
    await jurors.fillEditName(JUROR_NAME_EDITED);
    await jurors.saveEdit();
    await jurors.expectJurorRowVisible(JUROR_NAME_EDITED);
  });

  test("delete — type-to-confirm removes the juror row", async ({ page }) => {
    const jurors = await signInAndGotoJurors(page);
    await jurors.clickDeleteForJuror(JUROR_NAME_EDITED);
    await expect(jurors.deleteNameInput()).toBeVisible();
    await jurors.confirmDelete(JUROR_NAME_EDITED);
    await jurors.expectJurorRowGone(JUROR_NAME_EDITED);
  });

  test("create validation — missing name keeps save disabled", async ({ page }) => {
    const jurors = await signInAndGotoJurors(page);
    await jurors.openCreateDrawer();
    // Fill affiliation + email but skip name — save button should stay disabled.
    await jurors.drawerAffiliation().fill(JUROR_AFFIL);
    await jurors.drawerEmail().fill(JUROR_EMAIL);
    await expect(jurors.drawerSave()).toBeDisabled();
    // Drawer stays open.
    await expect(jurors.drawerCancel()).toBeVisible();
  });
});
