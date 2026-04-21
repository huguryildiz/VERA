import { describe, expect, vi, beforeEach } from "vitest";
import { qaTest } from "../../test/qaTest.js";

vi.mock("../../shared/lib/supabaseClient", () => ({ supabase: {} }));
import { supabase } from "../../shared/lib/supabaseClient";
import { listOrgAdminMembers } from "../../shared/api/admin/organizations.js";

describe("listOrgAdminMembers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  qaTest("settings.team.api.01", async () => {
    supabase.rpc = vi.fn().mockResolvedValue({ data: [{ id: "m1" }], error: null });
    const result = await listOrgAdminMembers();
    expect(supabase.rpc).toHaveBeenCalledWith("rpc_org_admin_list_members");
    expect(result).toEqual([{ id: "m1" }]);
  });

  qaTest("settings.team.api.02", async () => {
    supabase.rpc = vi.fn().mockResolvedValue({ data: null, error: { message: "unauthorized" } });
    await expect(listOrgAdminMembers()).rejects.toMatchObject({ message: "unauthorized" });
  });

  qaTest("settings.team.api.03", async () => {
    supabase.rpc = vi.fn().mockResolvedValue({ data: null, error: null });
    const result = await listOrgAdminMembers();
    expect(result).toEqual([]);
  });
});
