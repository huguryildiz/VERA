import { describe, expect, vi, beforeEach } from "vitest";
import { qaTest } from "../../../../test/qaTest.js";

const { mockGetSession, mockGetUser, mockRpc, mockFrom } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockGetUser: vi.fn(),
  mockRpc: vi.fn(),
  mockFrom: vi.fn(),
}));

vi.mock("@/shared/lib/supabaseClient", () => ({
  supabase: {
    rpc: mockRpc,
    from: mockFrom,
    auth: {
      getSession: mockGetSession,
      getUser: mockGetUser,
    },
  },
}));

import { getSession, checkEmailAvailable, listOrganizationsPublic } from "../../admin/auth.js";

describe("admin/auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  qaTest("api.admin.auth.01", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const result = await getSession();
    expect(result).toBeNull();
  });

  qaTest("api.admin.auth.02", async () => {
    mockRpc.mockResolvedValue({ data: { available: true }, error: null });
    await checkEmailAvailable("test@example.com");
    expect(mockRpc).toHaveBeenCalledWith("rpc_check_email_available", {
      p_email: "test@example.com",
    });
  });

  qaTest("api.admin.auth.03", async () => {
    const dbError = new Error("connection refused");
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: null, error: dbError }),
        }),
      }),
    });
    await expect(listOrganizationsPublic()).rejects.toThrow("connection refused");
  });
});
