import { describe, expect, vi, beforeEach } from "vitest";
import { qaTest } from "../../../../test/qaTest.js";

const { mockFrom, mockRpc, mockInvoke } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockRpc: vi.fn(),
  mockInvoke: vi.fn(),
}));

vi.mock("@/shared/api/core/client", () => ({
  supabase: { from: mockFrom, rpc: mockRpc },
}));

vi.mock("@/shared/api/core/invokeEdgeFunction", () => ({
  invokeEdgeFunction: mockInvoke,
}));

import {
  listAdminSessions,
  deleteAdminSession,
  touchAdminSession,
} from "../../admin/sessions.js";

describe("admin/sessions API", () => {
  beforeEach(() => vi.clearAllMocks());

  qaTest("api.admin.sessions.01", async () => {
    const rows = [{ id: "s1", last_activity_at: "2025-01-01T00:00:00Z" }];
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: rows, error: null }),
      }),
    });

    const result = await listAdminSessions();
    expect(result).toEqual(rows);
    expect(mockFrom).toHaveBeenCalledWith("admin_user_sessions");
  });

  qaTest("api.admin.sessions.02", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: null, error: { message: "permission denied" } }),
      }),
    });
    await expect(listAdminSessions()).rejects.toMatchObject({ message: "permission denied" });
  });

  qaTest("api.admin.sessions.03", async () => {
    mockRpc.mockResolvedValue({ data: { ok: true }, error: null });

    const result = await deleteAdminSession("s1");
    expect(result).toEqual({ ok: true });
    expect(mockRpc).toHaveBeenCalledWith("rpc_admin_revoke_admin_session", { p_session_id: "s1" });
  });

  qaTest("api.admin.sessions.04", async () => {
    mockRpc.mockResolvedValue({ data: { ok: false, error_code: "session_not_found" }, error: null });
    await expect(deleteAdminSession("s1")).rejects.toThrow("session_not_found");
  });

  qaTest("api.admin.sessions.05", async () => {
    mockInvoke.mockResolvedValue({ data: { ok: true }, error: null });

    const result = await touchAdminSession({
      deviceId: "dev-1",
      userAgent: "Mozilla/5.0",
      browser: "Chrome",
      os: "macOS",
      authMethod: "email",
      signedInAt: null,
      expiresAt: null,
    });
    expect(result).toEqual({ ok: true });
    expect(mockInvoke).toHaveBeenCalledWith(
      "admin-session-touch",
      expect.objectContaining({
        body: expect.objectContaining({
          deviceId: "dev-1",
          browser: "Chrome",
          os: "macOS",
        }),
      })
    );
  });
});
