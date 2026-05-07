// supabase/functions/auto-backup/index.ts
// ============================================================
// Creates daily JSON backups for all active organizations.
//
// Triggered by pg_cron via net.http_post (see 038_auto_backup_cron.sql).
// Can also be called manually by a super_admin for testing.
//
// Auth:
//   - Service role key as Bearer token (cron path — bypasses JWT check)
//   - Valid super_admin JWT (manual trigger path)
//
// For each active org:
//   1. Export all evaluation data (periods, projects, jurors, scores, audit_logs)
//   2. Upload JSON to Storage bucket 'backups'
//   3. Register row via rpc_backup_register (which writes audit log)
//
// Returns: { backed_up: [{orgId, path, sizeBytes}], errors: [{orgId, message}] }
// ============================================================

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

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

// ── Full export for a single org (server-side, service role) ─────────────────
async function fullExportForOrg(service: SupabaseClient, organizationId: string) {
  const [periodsRes, jurorsRes, auditRes] = await Promise.all([
    service.from("periods").select("*").eq("organization_id", organizationId),
    service.from("jurors").select("*").eq("organization_id", organizationId),
    service
      .from("audit_logs")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  if (periodsRes.error) throw periodsRes.error;
  if (jurorsRes.error) throw jurorsRes.error;

  const periodIds = (periodsRes.data || []).map((p: { id: string }) => p.id);

  let projects: unknown[] = [];
  let scores: unknown[] = [];

  if (periodIds.length > 0) {
    const [projRes, sheetRes] = await Promise.all([
      service.from("projects").select("*").in("period_id", periodIds),
      service
        .from("score_sheets")
        .select(
          "id, juror_id, project_id, period_id, comment, status, created_at, updated_at, items:score_sheet_items(score_value, period_criteria(key))",
        )
        .in("period_id", periodIds),
    ]);

    if (projRes.error) throw projRes.error;
    if (sheetRes.error) throw sheetRes.error;

    projects = projRes.data || [];
    scores = (sheetRes.data || []).map((s: {
      id: string; juror_id: string; project_id: string; period_id: string;
      comment: string; status: string; created_at: string; updated_at: string;
      items?: { score_value: number | null; period_criteria?: { key: string } }[];
    }) => {
      const row: Record<string, unknown> = {
        id: s.id, juror_id: s.juror_id, project_id: s.project_id,
        period_id: s.period_id, comment: s.comment, status: s.status,
        created_at: s.created_at, updated_at: s.updated_at,
      };
      (s.items || []).forEach((item) => {
        const key = item.period_criteria?.key;
        if (key) row[key] = item.score_value != null ? Number(item.score_value) : null;
      });
      return row;
    });
  }

  return {
    exported_at: new Date().toISOString(),
    organization_id: organizationId,
    periods: periodsRes.data || [],
    projects,
    jurors: jurorsRes.data || [],
    scores,
    audit_logs: auditRes.data || [],
  };
}

// ── Main handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return json(500, { error: "Supabase environment not configured." });
  }

  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return json(401, { error: "Missing bearer token" });

  // ── Auth: accept service role key (cron) or super_admin JWT (manual) ───────
  const isCron = token === serviceKey;

  if (!isCron) {
    // Validate as super_admin JWT
    const caller = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: isSuperAdmin, error: authErr } = await caller.rpc("current_user_is_super_admin");
    if (authErr || !isSuperAdmin) {
      return json(403, { error: "super_admin or service role required" });
    }
  }

  const service = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  // ── Fetch all active organizations ──────────────────────────────────────────
  const { data: orgs, error: orgsErr } = await service
    .from("organizations")
    .select("id, name")
    .eq("status", "active");

  if (orgsErr) {
    return json(500, { error: `Failed to list organizations: ${orgsErr.message}` });
  }

  if (!orgs || orgs.length === 0) {
    return json(200, { ok: true, backed_up: [], message: "No active organizations" });
  }

  const BUCKET = "backups";
  const backed_up: { orgId: string; orgName: string; path: string; sizeBytes: number }[] = [];
  const errors: { orgId: string; orgName: string; message: string }[] = [];

  // ── Process each org sequentially (avoids storage burst) ───────────────────
  for (const org of orgs) {
    try {
      const payload = await fullExportForOrg(service, org.id);

      const rowCounts = {
        periods: (payload.periods || []).length,
        projects: (payload.projects || []).length,
        jurors: (payload.jurors || []).length,
        scores: (payload.scores || []).length,
        audit_logs: (payload.audit_logs || []).length,
      };

      const periodIds = (payload.periods as { id: string }[]).map((p) => p.id).filter(Boolean);
      const backupUuid = crypto.randomUUID();
      const path = `${org.id}/${backupUuid}.json`;
      const jsonBytes = new TextEncoder().encode(JSON.stringify(payload));
      const blob = new Blob([jsonBytes], { type: "application/json" });

      const { error: uploadError } = await service.storage
        .from(BUCKET)
        .upload(path, blob, { contentType: "application/json", upsert: false });

      if (uploadError) throw uploadError;

      const { error: rpcError } = await service.rpc("rpc_backup_register", {
        p_organization_id: org.id,
        p_storage_path: path,
        p_size_bytes: jsonBytes.byteLength,
        p_format: "json",
        p_row_counts: rowCounts,
        p_period_ids: periodIds,
        p_origin: "auto",
      });

      if (rpcError) {
        // Best-effort rollback
        await service.storage.from(BUCKET).remove([path]).catch(() => {});
        throw rpcError;
      }

      backed_up.push({ orgId: org.id, orgName: org.name, path, sizeBytes: jsonBytes.byteLength });
      console.log(`[auto-backup] ✓ ${org.name} (${org.id}) → ${path} (${jsonBytes.byteLength} bytes)`);
    } catch (e) {
      const msg = (e as Error)?.message || "Unknown error";
      errors.push({ orgId: org.id, orgName: org.name, message: msg });
      console.error(`[auto-backup] ✗ ${org.name} (${org.id}): ${msg}`);
    }
  }

  const status = errors.length > 0 && backed_up.length === 0 ? 500 : 200;
  return json(status, {
    ok: errors.length === 0,
    backed_up,
    errors: errors.length > 0 ? errors : undefined,
  });
});
