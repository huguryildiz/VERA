// supabase/functions/invite-org-admin/index.ts
// ============================================================
// Invites a new admin (or adds an existing user) to an organization.
//
// Flow:
// 1) Caller JWT is verified; _assert_org_admin ensures they're an org admin.
// 2) Validate email. Check for existing membership (early return 409).
// 3) Look up user in auth.users by email (service-only RPC).
//    a) Existing confirmed user  → insert membership 'active',  status:'added'
//    b) Existing unconfirmed     → re-send Supabase invite email,
//                                  insert membership 'invited', status:'reinvited'
//    c) New user                 → inviteUserByEmail + insert membership
//                                  'invited',                   status:'invited'
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function ensureProfile(service: ReturnType<typeof createClient>, userId: string) {
  await service.from("profiles").insert({ id: userId }).then(() => null).catch(() => null);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) return json(401, { error: "Missing bearer token" });

    const { org_id, email } = await req.json();
    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!org_id || typeof org_id !== "string") {
      return json(400, { error: "Missing required field: org_id" });
    }
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      return json(400, { error: "A valid email is required." });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !anonKey || !serviceKey) {
      return json(500, { error: "Supabase environment is not configured." });
    }

    // Caller client — user JWT, validates auth + org admin access
    const caller = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    // Service client — bypasses RLS for admin operations
    const service = createClient(supabaseUrl, serviceKey);

    // ── 1. Auth check: caller must be org admin ─────────────────────────────
    const { error: authErr } = await caller.rpc("_assert_org_admin", {
      p_org_id: org_id,
    });
    if (authErr) {
      const status = authErr.message === "unauthorized" ? 403 : 400;
      return json(status, { error: authErr.message });
    }

    // ── 2. Find user in auth.users by email ─────────────────────────────────
    const { data: userRows, error: findErr } = await service.rpc(
      "rpc_admin_find_user_by_email",
      { p_email: normalizedEmail },
    );
    if (findErr) return json(500, { error: findErr.message });

    const existingUser = Array.isArray(userRows) && userRows.length > 0
      ? userRows[0] as { id: string; email_confirmed_at: string | null }
      : null;

    // ── 3. If user exists, check for existing membership ────────────────────
    if (existingUser?.id) {
      const { data: existingMembership } = await service
        .from("memberships")
        .select("id, status")
        .eq("user_id", existingUser.id)
        .eq("organization_id", org_id)
        .maybeSingle();

      if (existingMembership) {
        return json(409, {
          error: "already_member",
          status: existingMembership.status,
        });
      }
    }

    const appUrl = (Deno.env.get("NOTIFICATION_APP_URL") || "https://vera-eval.app").trim();
    const redirectTo = `${appUrl}/invite/accept`;

    // ── 4a. Existing confirmed user → add as active ─────────────────────────
    if (existingUser?.id && existingUser.email_confirmed_at) {
      const userId = existingUser.id;
      await ensureProfile(service, userId);

      const { error: memErr } = await service.from("memberships").insert({
        user_id: userId,
        organization_id: org_id,
        role: "org_admin",
        status: "active",
      });
      if (memErr) return json(400, { error: memErr.message });

      return json(200, { status: "added", user_id: userId });
    }

    // ── 4b. Existing unconfirmed user → re-invite ───────────────────────────
    if (existingUser?.id && !existingUser.email_confirmed_at) {
      const userId = existingUser.id;

      const { error: inviteErr } = await service.auth.admin.inviteUserByEmail(
        normalizedEmail,
        { redirectTo },
      );
      if (inviteErr) return json(400, { error: inviteErr.message });

      await ensureProfile(service, userId);

      const { error: memErr } = await service.from("memberships").insert({
        user_id: userId,
        organization_id: org_id,
        role: "org_admin",
        status: "invited",
      });
      if (memErr) return json(400, { error: memErr.message });

      return json(200, { status: "reinvited", user_id: userId });
    }

    // ── 4c. New user → invite via Supabase Auth ─────────────────────────────
    const { data: invited, error: inviteErr } = await service.auth.admin.inviteUserByEmail(
      normalizedEmail,
      { redirectTo },
    );
    if (inviteErr) return json(400, { error: inviteErr.message });

    const newUserId = invited?.user?.id;
    if (!newUserId) return json(500, { error: "Could not create invited user." });

    await ensureProfile(service, newUserId);

    const { error: memErr } = await service.from("memberships").insert({
      user_id: newUserId,
      organization_id: org_id,
      role: "org_admin",
      status: "invited",
    });
    if (memErr) return json(400, { error: memErr.message });

    return json(200, { status: "invited", user_id: newUserId, email: normalizedEmail });

  } catch (e) {
    return json(500, { error: (e as Error).message || "Internal server error" });
  }
});
