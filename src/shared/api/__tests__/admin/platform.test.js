import { describe, expect, vi, beforeEach } from "vitest";
import { qaTest } from "../../../../test/qaTest.js";

const { mockRpc } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
}));

vi.mock("@/shared/api/core/client", () => ({
  supabase: { rpc: mockRpc },
}));

import { getPlatformSettings, setPlatformSettings } from "../../admin/platform.js";

describe("admin/platform API", () => {
  beforeEach(() => vi.clearAllMocks());

  qaTest("api.admin.plat.01", async () => {
    const settings = {
      platform_name: "VERA",
      support_email: "support@vera.io",
      auto_approve_new_orgs: false,
      updated_at: "2025-01-01T00:00:00",
      updated_by: "admin-uuid",
    };
    mockRpc.mockResolvedValue({ data: settings, error: null });

    const result = await getPlatformSettings();
    expect(result).toEqual(settings);
    expect(mockRpc).toHaveBeenCalledWith("rpc_admin_get_platform_settings");
  });

  qaTest("api.admin.plat.02", async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });

    await setPlatformSettings({
      platform_name: "VERA",
      support_email: "support@vera.io",
      auto_approve_new_orgs: true,
    });

    expect(mockRpc).toHaveBeenCalledWith("rpc_admin_set_platform_settings", {
      p_platform_name: "VERA",
      p_support_email: "support@vera.io",
      p_auto_approve_new_orgs: true,
    });
  });

  qaTest("api.admin.plat.03", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "permission denied" } });

    await expect(getPlatformSettings()).rejects.toMatchObject({ message: "permission denied" });
  });
});
