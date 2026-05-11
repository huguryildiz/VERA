import { describe, expect, vi, beforeEach } from "vitest";
import { render, waitFor, act } from "@testing-library/react";
import { qaTest } from "../../../test/qaTest";

vi.mock("@/shared/lib/supabaseClient", () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      getSession: vi.fn(),
    },
  },
  clearPersistedSession: vi.fn(),
}));

const mockGetAdminBootstrap = vi.fn();
const mockGetSession = vi.fn().mockResolvedValue([]);
const mockGetMyJoinRequests = vi.fn().mockResolvedValue([]);
const mockListOrganizationsPublic = vi.fn().mockResolvedValue([]);
const mockGetSecurityPolicy = vi.fn().mockResolvedValue({});
const mockGetPublicAuthFlags = vi.fn().mockResolvedValue({});
const mockTouchAdminSession = vi.fn().mockResolvedValue({});

vi.mock("@/shared/api", () => ({
  getAdminBootstrap: (...args) => mockGetAdminBootstrap(...args),
  getSession: (...args) => mockGetSession(...args),
  getMyJoinRequests: (...args) => mockGetMyJoinRequests(...args),
  listOrganizationsPublic: (...args) => mockListOrganizationsPublic(...args),
  getSecurityPolicy: (...args) => mockGetSecurityPolicy(...args),
  getPublicAuthFlags: (...args) => mockGetPublicAuthFlags(...args),
  touchAdminSession: (...args) => mockTouchAdminSession(...args),
}));

vi.mock("@/shared/api/admin/profiles", () => ({
  upsertProfile: vi.fn().mockResolvedValue({ display_name: "Test User" }),
}));

vi.mock("@/shared/storage/adminStorage", () => ({
  getActiveOrganizationId: vi.fn().mockReturnValue(null),
  setActiveOrganizationId: vi.fn(),
}));

import AuthProvider from "../AuthProvider.jsx";
import { supabase } from "@/shared/lib/supabaseClient";

const SIGNED_IN_SESSION = {
  user: {
    id: "user-uuid-1",
    email: "admin@example.com",
    user_metadata: { profile_completed: true },
  },
  access_token: "token-abc",
};

function makeBootstrapPayload(overrides = {}) {
  return {
    memberships: [
      {
        organization_id: "org-uuid-1",
        role: "admin",
        email_verified_at: null,
        grace_ends_at: null,
        organization: { code: "TEDU-EE", name: "TEDU EE", setup_completed_at: null },
      },
    ],
    organizations: [],
    preferred_organization_id: "org-uuid-1",
    periods: [{ id: "period-uuid-1", name: "Spring 2026" }],
    default_period_id: "period-uuid-1",
    ...overrides,
  };
}

function setupSignedIn(authCallbackHolder) {
  vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null } });
  vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((cb) => {
    authCallbackHolder.cb = cb;
    return { data: { subscription: { unsubscribe: vi.fn() } } };
  });
}

describe("auth/shared/AuthProvider/bootstrap-fast-path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete window.__VERA_BOOTSTRAP_PREFERRED;
  });

  qaTest("auth.bootstrap.01", async () => {
    const holder = {};
    setupSignedIn(holder);
    mockGetAdminBootstrap.mockResolvedValueOnce(makeBootstrapPayload());

    render(<AuthProvider><div>App</div></AuthProvider>);
    await waitFor(() => expect(holder.cb).toBeDefined());

    await act(async () => {
      await holder.cb("SIGNED_IN", SIGNED_IN_SESSION);
    });

    await waitFor(() => {
      expect(mockGetAdminBootstrap).toHaveBeenCalledTimes(1);
      expect(mockGetSession).not.toHaveBeenCalled();
    });
  });

  qaTest("auth.bootstrap.02", async () => {
    const holder = {};
    setupSignedIn(holder);
    mockGetAdminBootstrap.mockRejectedValueOnce(new Error("network error"));
    mockGetSession.mockResolvedValue([]);

    render(<AuthProvider><div>App</div></AuthProvider>);
    await waitFor(() => expect(holder.cb).toBeDefined());

    await act(async () => {
      await holder.cb("SIGNED_IN", SIGNED_IN_SESSION);
    });

    await waitFor(() => {
      expect(mockGetAdminBootstrap).toHaveBeenCalledTimes(1);
      expect(mockGetSession).toHaveBeenCalled();
    });
  });

  qaTest("auth.bootstrap.03", async () => {
    const holder = {};
    setupSignedIn(holder);
    mockGetAdminBootstrap.mockResolvedValueOnce({ ok: false, error_code: "unauthenticated" });
    mockGetSession.mockResolvedValue([]);

    render(<AuthProvider><div>App</div></AuthProvider>);
    await waitFor(() => expect(holder.cb).toBeDefined());

    await act(async () => {
      await holder.cb("SIGNED_IN", SIGNED_IN_SESSION);
    });

    await waitFor(() => {
      expect(mockGetAdminBootstrap).toHaveBeenCalledTimes(1);
      expect(mockGetSession).toHaveBeenCalled();
    });
  });

  qaTest("auth.bootstrap.04", async () => {
    const holder = {};
    setupSignedIn(holder);
    const payload = makeBootstrapPayload();
    mockGetAdminBootstrap.mockResolvedValueOnce(payload);

    render(<AuthProvider><div>App</div></AuthProvider>);
    await waitFor(() => expect(holder.cb).toBeDefined());

    await act(async () => {
      await holder.cb("SIGNED_IN", SIGNED_IN_SESSION);
    });

    await waitFor(() => {
      expect(window.__VERA_BOOTSTRAP_PREFERRED).toBeDefined();
      expect(window.__VERA_BOOTSTRAP_PREFERRED.orgId).toBe("org-uuid-1");
      expect(window.__VERA_BOOTSTRAP_PREFERRED.defaultPeriodId).toBe("period-uuid-1");
      expect(window.__VERA_BOOTSTRAP_PREFERRED.periods).toEqual(payload.periods);
      expect(typeof window.__VERA_BOOTSTRAP_PREFERRED.expiresAt).toBe("number");
    });
  });
});
