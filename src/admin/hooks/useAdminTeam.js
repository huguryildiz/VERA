import { useState, useEffect, useCallback } from "react";
import {
  listOrgAdminMembers,
  inviteOrgAdmin,
  cancelOrgAdminInvite,
} from "../../shared/api";
import { useToast } from "@/shared/hooks/useToast";

function mapMembers(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((m) => ({
    id: m.id,
    userId: m.user_id || null,
    email: m.email || "",
    displayName: m.display_name || null,
    status: m.status === "active" ? "active" : "invited",
    joinedAt: m.status === "active" ? m.created_at || null : null,
    invitedAt: m.status === "invited" ? m.created_at || null : null,
  }));
}

const INITIAL_INVITE_FORM = { open: false, email: "", submitting: false, error: null };

export function useAdminTeam(orgId) {
  const toast = useToast();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [inviteForm, setInviteForm] = useState(INITIAL_INVITE_FORM);

  const refetch = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setError(null);
    try {
      const raw = await listOrgAdminMembers();
      setMembers(mapMembers(raw));
    } catch (e) {
      setError(e.message || "Failed to load team");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const openInviteForm = useCallback(
    () => setInviteForm((f) => ({ ...f, open: true })),
    []
  );

  const closeInviteForm = useCallback(() => setInviteForm(INITIAL_INVITE_FORM), []);

  const setInviteEmail = useCallback(
    (email) => setInviteForm((f) => ({ ...f, email })),
    []
  );

  const sendInvite = useCallback(async () => {
    const email = inviteForm.email.trim();
    if (!email) {
      setInviteForm((f) => ({ ...f, error: "Email is required" }));
      return;
    }
    setInviteForm((f) => ({ ...f, submitting: true, error: null }));
    try {
      const result = await inviteOrgAdmin(orgId, email);
      const msg =
        result?.status === "reinvited"
          ? "Invite resent"
          : result?.status === "added"
          ? "Admin added"
          : "Invite sent";
      toast.success(msg);
      setInviteForm(INITIAL_INVITE_FORM);
      await refetch();
    } catch (e) {
      setInviteForm((f) => ({
        ...f,
        submitting: false,
        error: e.message || "Failed to send invite",
      }));
    }
  }, [orgId, inviteForm.email, toast, refetch]);

  const resendInvite = useCallback(
    async (_membershipId, email) => {
      try {
        await inviteOrgAdmin(orgId, email);
        toast.success("Invite resent");
        await refetch();
      } catch (e) {
        toast.error(e.message || "Failed to resend");
      }
    },
    [orgId, toast, refetch]
  );

  const cancelInvite = useCallback(
    async (membershipId) => {
      try {
        await cancelOrgAdminInvite(membershipId);
        toast.success("Invite cancelled");
        await refetch();
      } catch (e) {
        toast.error(e.message || "Failed to cancel");
      }
    },
    [toast, refetch]
  );

  return {
    members,
    loading,
    error,
    inviteForm,
    openInviteForm,
    closeInviteForm,
    setInviteEmail,
    sendInvite,
    resendInvite,
    cancelInvite,
  };
}
