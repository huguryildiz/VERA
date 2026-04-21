import { describe, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { qaTest } from "../../test/qaTest.js";

vi.mock("../../shared/lib/supabaseClient", () => ({ supabase: {} }));
vi.mock("../../shared/api", () => ({
  listOrgAdminMembers: vi.fn(),
  inviteOrgAdmin: vi.fn(),
  cancelOrgAdminInvite: vi.fn(),
}));
vi.mock("../../shared/hooks/useToast", () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

import { listOrgAdminMembers, inviteOrgAdmin, cancelOrgAdminInvite } from "../../shared/api";
import { useAdminTeam } from "../hooks/useAdminTeam.js";

const RAW_MEMBER = {
  id: "m1",
  user_id: "u1",
  status: "active",
  created_at: "2025-03-01T00:00:00Z",
  display_name: "Alice",
  email: "alice@test.com",
};

describe("useAdminTeam", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  qaTest("settings.team.hook.01", async () => {
    listOrgAdminMembers.mockResolvedValue([RAW_MEMBER]);
    const { result } = renderHook(() => useAdminTeam("org1"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(listOrgAdminMembers).toHaveBeenCalledTimes(1);
    expect(result.current.members).toHaveLength(1);
    expect(result.current.members[0].email).toBe("alice@test.com");
    expect(result.current.members[0].status).toBe("active");
  });

  qaTest("settings.team.hook.02", async () => {
    const { result } = renderHook(() => useAdminTeam(null));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(listOrgAdminMembers).not.toHaveBeenCalled();
    expect(result.current.members).toEqual([]);
  });

  qaTest("settings.team.hook.03", async () => {
    listOrgAdminMembers.mockResolvedValue([]);
    inviteOrgAdmin.mockResolvedValue({ status: "invited" });
    const { result } = renderHook(() => useAdminTeam("org1"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.openInviteForm());
    act(() => result.current.setInviteEmail("bob@test.com"));
    await act(async () => { await result.current.sendInvite(); });
    expect(inviteOrgAdmin).toHaveBeenCalledWith("org1", "bob@test.com");
    expect(listOrgAdminMembers).toHaveBeenCalledTimes(2); // initial + refetch
  });

  qaTest("settings.team.hook.04", async () => {
    listOrgAdminMembers.mockResolvedValue([]);
    cancelOrgAdminInvite.mockResolvedValue(undefined);
    const { result } = renderHook(() => useAdminTeam("org1"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.cancelInvite("m99"); });
    expect(cancelOrgAdminInvite).toHaveBeenCalledWith("m99");
    expect(listOrgAdminMembers).toHaveBeenCalledTimes(2); // initial + refetch
  });
});
