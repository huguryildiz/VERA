import { test, expect } from "@playwright/test";
import { LoginPom } from "../poms/LoginPom";
import { AdminShellPom } from "../poms/AdminShellPom";
import { OrgsPom } from "../poms/OrgsPom";
import { TenantApplicationPom } from "../poms/TenantApplicationPom";

// Super-admin credentials (demo env)
const EMAIL = process.env.E2E_ADMIN_EMAIL || "demo-admin@vera-eval.app";
const PASSWORD = process.env.E2E_ADMIN_PASSWORD || "";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Stable pre-seeded org in the demo DB — used to attach the test application.
const DEMO_ORG_ID = "b2c3d4e5-f6a7-8901-bcde-f12345678901";

async function seedApplication(
  request: Parameters<Parameters<typeof test>[1]>[0]["request"],
  applicantName: string,
): Promise<string> {
  const res = await request.post(`${SUPABASE_URL}/rest/v1/org_applications`, {
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    data: {
      organization_id: DEMO_ORG_ID,
      applicant_name: applicantName,
      contact_email: `${applicantName.toLowerCase().replace(/\s+/g, ".")}@e2e.local`,
      status: "pending",
    },
  });
  const rows = await res.json();
  return rows[0].id as string;
}

async function deleteApplication(
  request: Parameters<Parameters<typeof test>[1]>[0]["request"],
  applicationId: string,
): Promise<void> {
  await request.delete(`${SUPABASE_URL}/rest/v1/org_applications?id=eq.${applicationId}`, {
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
  });
}

async function signInAndGotoOrgs(page: Parameters<Parameters<typeof test>[1]>[0]["page"]) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem("vera.admin_tour_done", "1");
      localStorage.setItem("admin.remember_me", "true");
    } catch {}
  });
  const login = new LoginPom(page);
  const shell = new AdminShellPom(page);
  const orgs = new OrgsPom(page);
  await login.goto();
  await login.signIn(EMAIL, PASSWORD);
  await shell.expectOnDashboard();
  await shell.clickNav("organizations");
  await orgs.waitForReady();
  return new TenantApplicationPom(page);
}

test.describe("tenant application approve/reject", () => {
  test.describe.configure({ mode: "serial" });

  test("approve pending application → approved badge appears", async ({ page, request }) => {
    const appId = await seedApplication(request, "B8 E2E Approve Applicant");
    try {
      const appPom = await signInAndGotoOrgs(page);
      await appPom.waitForPendingList();
      await appPom.approveApplication(appId);
    } finally {
      await deleteApplication(request, appId);
    }
  });

  test("reject pending application → rejected badge appears", async ({ page, request }) => {
    const appId = await seedApplication(request, "B8 E2E Reject Applicant");
    try {
      const appPom = await signInAndGotoOrgs(page);
      await appPom.waitForPendingList();
      await appPom.rejectApplication(appId);
    } finally {
      await deleteApplication(request, appId);
    }
  });
});
