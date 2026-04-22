// src/admin/__tests__/deleteOrganization.test.js
import { describe, expect, vi, beforeEach } from "vitest";
import { qaTest } from "../../test/qaTest.js";

vi.mock("../../shared/lib/supabaseClient", () => ({ supabase: {} }));

import { supabase } from "../../shared/lib/supabaseClient";
import { deleteOrganization } from "../../shared/api/admin/organizations.js";

describe("deleteOrganization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  qaTest("deleteOrganization-rpc-call", async () => {
    supabase.rpc = vi.fn().mockResolvedValue({ data: undefined, error: null });

    await deleteOrganization("org-uuid-123");

    expect(supabase.rpc).toHaveBeenCalledWith("rpc_admin_delete_organization", {
      p_org_id: "org-uuid-123",
    });
  });

  qaTest("deleteOrganization-missing-org-id", async () => {
    await expect(deleteOrganization(undefined)).rejects.toThrow("organizationId required");
    await expect(deleteOrganization(null)).rejects.toThrow("organizationId required");
  });

  qaTest("deleteOrganization-supabase-error", async () => {
    supabase.rpc = vi.fn().mockResolvedValue({ data: null, error: { message: "unauthorized" } });
    await expect(deleteOrganization("org-uuid-123")).rejects.toMatchObject({ message: "unauthorized" });
  });
});
