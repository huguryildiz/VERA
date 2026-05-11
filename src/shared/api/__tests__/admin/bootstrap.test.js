import { vi, describe, beforeEach, expect } from "vitest";
import { qaTest } from "@/test/qaTest";

vi.mock("@/shared/lib/supabaseClient", () => ({
  supabase: { rpc: vi.fn() },
}));

import { supabase } from "@/shared/lib/supabaseClient";
import { getAdminBootstrap } from "@/shared/api/admin/bootstrap";

describe("getAdminBootstrap", () => {
  beforeEach(() => vi.clearAllMocks());

  qaTest("api.admin.bootstrap.01", async () => {
    const payload = {
      memberships: [],
      organizations: [],
      preferred_organization_id: "org-uuid-1",
      periods: [],
      default_period_id: null,
    };
    supabase.rpc.mockResolvedValueOnce({ data: payload, error: null });
    const result = await getAdminBootstrap();
    expect(result).toEqual(payload);
    expect(supabase.rpc).toHaveBeenCalledWith("rpc_admin_bootstrap", {
      p_preferred_organization_id: null,
      p_default_period_id: null,
    });
  });

  qaTest("api.admin.bootstrap.02", async () => {
    const orgId = "org-uuid-2";
    const periodId = "period-uuid-2";
    supabase.rpc.mockResolvedValueOnce({
      data: {
        memberships: [],
        organizations: [],
        preferred_organization_id: orgId,
        periods: [],
        default_period_id: periodId,
      },
      error: null,
    });
    await getAdminBootstrap({ preferredOrganizationId: orgId, defaultPeriodId: periodId });
    expect(supabase.rpc).toHaveBeenCalledWith("rpc_admin_bootstrap", {
      p_preferred_organization_id: orgId,
      p_default_period_id: periodId,
    });
  });

  qaTest("api.admin.bootstrap.03", async () => {
    const errorPayload = { ok: false, error_code: "unauthenticated" };
    supabase.rpc.mockResolvedValueOnce({ data: errorPayload, error: null });
    const result = await getAdminBootstrap();
    expect(result).toEqual(errorPayload);
  });

  qaTest("api.admin.bootstrap.04", async () => {
    const rpcError = new Error("RPC connection failed");
    supabase.rpc.mockResolvedValueOnce({ data: null, error: rpcError });
    await expect(getAdminBootstrap()).rejects.toThrow("RPC connection failed");
  });
});
