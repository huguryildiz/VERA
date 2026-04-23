import { describe, expect, vi, beforeEach } from "vitest";
import { qaTest } from "../../../../test/qaTest.js";

const { mockRpc } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
}));

vi.mock("@/shared/api/core/client", () => ({
  supabase: { rpc: mockRpc },
}));

import {
  getPublicAuthFlags,
  getSecurityPolicy,
  setSecurityPolicy,
  getPinPolicy,
  setPinPolicy,
} from "../../admin/security.js";

describe("admin/security API", () => {
  beforeEach(() => vi.clearAllMocks());

  qaTest("api.admin.security.01", async () => {
    const flags = { googleOAuth: true, emailPassword: true, rememberMe: false };
    mockRpc.mockResolvedValue({ data: flags, error: null });

    const result = await getPublicAuthFlags();
    expect(result).toEqual(flags);
    expect(mockRpc).toHaveBeenCalledWith("rpc_public_auth_flags");
  });

  qaTest("api.admin.security.02", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "permission denied" } });
    await expect(getPublicAuthFlags()).rejects.toMatchObject({ message: "permission denied" });
  });

  qaTest("api.admin.security.03", async () => {
    const policy = { googleOAuth: true, emailPassword: true, rememberMe: true, qrTtl: "24h" };
    mockRpc.mockResolvedValue({ data: policy, error: null });

    const result = await getSecurityPolicy();
    expect(result).toEqual(policy);
    expect(mockRpc).toHaveBeenCalledWith("rpc_admin_get_security_policy");
  });

  qaTest("api.admin.security.04", async () => {
    const policy = { googleOAuth: false, emailPassword: true };
    mockRpc.mockResolvedValue({ data: { ok: true }, error: null });

    const result = await setSecurityPolicy(policy);
    expect(result).toEqual({ ok: true });
    expect(mockRpc).toHaveBeenCalledWith("rpc_admin_set_security_policy", { p_policy: policy });
  });

  qaTest("api.admin.security.05", async () => {
    mockRpc.mockResolvedValue({ data: { maxPinAttempts: 5, pinLockCooldown: "15m" }, error: null });

    const result = await getPinPolicy();
    expect(result).toEqual({ maxPinAttempts: 5, pinLockCooldown: "15m" });
    expect(mockRpc).toHaveBeenCalledWith("rpc_admin_get_pin_policy");

    mockRpc.mockResolvedValue({ data: { ok: true }, error: null });
    await setPinPolicy({ maxPinAttempts: 3, pinLockCooldown: "10m", qrTtl: "24h" });
    expect(mockRpc).toHaveBeenCalledWith("rpc_admin_set_pin_policy", {
      p_max_attempts: 3,
      p_cooldown: "10m",
      p_qr_ttl: "24h",
    });
  });
});
