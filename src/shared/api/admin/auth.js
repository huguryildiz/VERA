// src/shared/api/admin/auth.js
// Admin authentication (PostgREST).

import { supabase } from "../core/client";

/**
 * Returns current user's memberships with organization info.
 */
export async function getSession() {
  // Prefer cached session (no network, no slow lock hold) — RLS still validates
  // the JWT server-side on every PostgREST query. Fall back to getUser() if the
  // cache hasn't been committed yet, which happens in the small race window
  // right after signInWithPassword fires the SIGNED_IN event.
  let { data: { session } } = await supabase.auth.getSession();
  let user = session?.user || null;
  if (!user?.id) {
    const { data } = await supabase.auth.getUser();
    user = data?.user || null;
  }
  if (!user?.id) return null;

  const [membershipsRes, profileRes] = await Promise.all([
    supabase
      .from("memberships")
      .select("*, organization:organizations(id, name, code, status, setup_completed_at)")
      .eq("user_id", user.id)
      .in("status", ["active", "invited"]),
    supabase
      .from("profiles")
      .select("email_verified_at")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  if (membershipsRes.error) throw membershipsRes.error;
  const emailVerifiedAt = profileRes.data?.email_verified_at ?? null;
  return (membershipsRes.data || []).map((row) => ({ ...row, email_verified_at: emailVerifiedAt }));
}

/**
 * Returns current user's pending join requests (memberships with status='requested').
 */
export async function getMyJoinRequests() {
  let { data: { session } } = await supabase.auth.getSession();
  let user = session?.user || null;
  if (!user?.id) {
    const { data } = await supabase.auth.getUser();
    user = data?.user || null;
  }
  if (!user?.id) return [];

  const { data, error } = await supabase
    .from("memberships")
    .select("id, status, created_at, organization:organizations(id, name)")
    .eq("user_id", user.id)
    .eq("status", "requested");
  if (error) throw error;
  return data || [];
}

/**
 * Checks whether an email address is available for registration.
 * Accessible to anon via SECURITY DEFINER RPC.
 * @returns {{ available: boolean, reason?: string }}
 */
export async function checkEmailAvailable(email) {
  const { data, error } = await supabase.rpc("rpc_check_email_available", { p_email: email });
  if (error) throw error;
  return data;
}

/**
 * Lists active organizations for public dropdown.
 */
export async function listOrganizationsPublic() {
  const { data, error } = await supabase
    .from("organizations")
    .select("id, name, code, setup_completed_at")
    .eq("status", "active")
    .order("name");
  if (error) throw error;
  return data || [];
}

