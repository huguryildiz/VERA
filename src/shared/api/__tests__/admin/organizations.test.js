import { describe, expect, vi, beforeEach } from "vitest";
import { qaTest } from "../../../../test/qaTest.js";

const { mockFrom, mockRpc } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockRpc: vi.fn(),
}));

vi.mock("@/shared/lib/supabaseClient", () => ({
  supabase: { from: mockFrom, rpc: mockRpc },
}));

import { listOrganizations, createOrganization } from "../../admin/organizations.js";

describe("admin/organizations API", () => {
  beforeEach(() => vi.clearAllMocks());

  qaTest("api.admin.organizations.01", async () => {
    const rows = [
      {
        id: "org1",
        name: "TEDU CS",
        code: "tedu-cs",
        memberships: [{ id: "m1", user_id: "u1", profiles: { display_name: "Alice", email: "alice@tedu.edu" }, role: "admin", status: "active", is_owner: true, created_at: "2025-01-01" }],
        org_applications: [],
      },
    ];
    mockRpc.mockResolvedValue({ data: rows, error: null });

    const result = await listOrganizations();
    expect(result).toHaveLength(1);
    expect(result[0].shortLabel).toBe("tedu-cs");
    expect(result[0].tenantAdmins).toHaveLength(1);
    expect(result[0].tenantAdmins[0].name).toBe("Alice");
    expect(result[0].pendingApplications).toHaveLength(0);
  });

  qaTest("api.admin.organizations.02", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "permission denied" } });
    await expect(listOrganizations()).rejects.toMatchObject({ message: "permission denied" });
  });

  qaTest("api.admin.organizations.03", async () => {
    const created = { id: "org2", name: "ITU", code: "itu" };
    mockFrom.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: created, error: null }),
        }),
      }),
    });

    const result = await createOrganization({ name: "ITU", code: "itu" });
    expect(result).toEqual(created);
  });
});
