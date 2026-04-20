// src/admin/__tests__/markSetupComplete.test.js
import { describe, expect, vi, beforeEach } from "vitest";
import { qaTest } from "../../test/qaTest.js";

vi.mock("../../shared/lib/supabaseClient", () => ({ supabase: {} }));

import { supabase } from "../../shared/lib/supabaseClient";
import { markSetupComplete } from "../../shared/api/admin/organizations.js";

describe("markSetupComplete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  qaTest("markSetupComplete-rpc-call", async () => {
    const ts = "2026-04-20T10:00:00.000Z";
    supabase.rpc = vi.fn().mockResolvedValue({ data: ts, error: null });

    const result = await markSetupComplete("org-uuid-123");

    expect(supabase.rpc).toHaveBeenCalledWith("rpc_admin_mark_setup_complete", {
      p_org_id: "org-uuid-123",
    });
    expect(result).toBe(ts);
  });

  qaTest("markSetupComplete-missing-org-id", async () => {
    await expect(markSetupComplete(undefined)).rejects.toThrow("organizationId required");
    await expect(markSetupComplete(null)).rejects.toThrow("organizationId required");
  });

  qaTest("markSetupComplete-supabase-error", async () => {
    supabase.rpc = vi.fn().mockResolvedValue({ data: null, error: { message: "unauthorized" } });
    await expect(markSetupComplete("org-uuid-123")).rejects.toMatchObject({ message: "unauthorized" });
  });
});
