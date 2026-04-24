import { test, expect } from "@playwright/test";

// Cross-tenant security: Supabase RLS must prevent a tenant-admin from reading
// another tenant's data. These tests hit the REST API directly with the
// tenant-admin's JWT and assert that the response is empty (row-level filtered).
//
// Demo org IDs (pre-seeded):
//   OWN_ORG_ID   — the org the tenant-admin belongs to
//   OTHER_ORG_ID — a different tenant's org (super-admin org)

const SUPABASE_URL = process.env.VITE_DEMO_SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const TENANT_EMAIL = "tenant-admin@vera-eval.app";
const TENANT_PASSWORD = "TenantAdmin2026!";
const OTHER_ORG_ID = "c3d4e5f6-a7b8-9012-cdef-123456789012";

async function getTenantJwt(request: Parameters<Parameters<typeof test>[1]>[0]["request"]): Promise<string> {
  const res = await request.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    headers: { apikey: process.env.VITE_DEMO_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "" },
    data: { email: TENANT_EMAIL, password: TENANT_PASSWORD },
  });
  const body = await res.json();
  return body.access_token as string;
}

test.describe("cross-tenant data isolation (RLS)", () => {
  test("tenant-admin cannot read another org's members", async ({ request }) => {
    const jwt = await getTenantJwt(request);
    const anonKey = process.env.VITE_DEMO_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

    const res = await request.get(
      `${SUPABASE_URL}/rest/v1/memberships?organization_id=eq.${OTHER_ORG_ID}&select=id`,
      {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${jwt}`,
        },
      },
    );

    expect(res.ok()).toBe(true);
    const rows = await res.json();
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBe(0);
  });

  test("tenant-admin cannot read another org's periods", async ({ request }) => {
    const jwt = await getTenantJwt(request);
    const anonKey = process.env.VITE_DEMO_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

    const res = await request.get(
      `${SUPABASE_URL}/rest/v1/periods?organization_id=eq.${OTHER_ORG_ID}&select=id`,
      {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${jwt}`,
        },
      },
    );

    expect(res.ok()).toBe(true);
    const rows = await res.json();
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBe(0);
  });

  test("tenant-admin cannot read another org's jurors", async ({ request }) => {
    const jwt = await getTenantJwt(request);
    const anonKey = process.env.VITE_DEMO_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

    const res = await request.get(
      `${SUPABASE_URL}/rest/v1/jurors?organization_id=eq.${OTHER_ORG_ID}&select=id`,
      {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${jwt}`,
        },
      },
    );

    expect(res.ok()).toBe(true);
    const rows = await res.json();
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBe(0);
  });
});
