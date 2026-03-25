-- ============================================================
-- 013_grants_rls.sql
-- GRANT EXECUTE statements for all public/admin RPCs,
-- RLS enablement for all tables, and policy cleanup.
--
-- Function name changes applied:
--   rpc_get_active_semester        → rpc_get_current_semester
--   rpc_admin_set_active_semester  → rpc_admin_set_current_semester
--   rpc_admin_semester_set_active  → rpc_admin_semester_set_current
-- ============================================================

-- ── Policy cleanup ──────────────────────────────────────────
-- Drop all existing policies on public tables to start clean.

DO $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'tenants', 'semesters', 'projects', 'jurors',
        'scores', 'settings', 'juror_semester_auth', 'audit_logs',
        'tenant_admin_memberships', 'tenant_admin_applications',
        'admin_profiles'
      )
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I.%I',
      rec.policyname, rec.schemaname, rec.tablename
    );
  END LOOP;
END;
$$;

-- ── RLS enablement (default deny) ───────────────────────────

ALTER TABLE public.tenants                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.semesters                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jurors                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scores                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.juror_semester_auth      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_admin_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_admin_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_profiles           ENABLE ROW LEVEL SECURITY;

-- ── Internal helper grants ──────────────────────────────────

REVOKE ALL ON FUNCTION public._verify_rpc_secret(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._verify_rpc_secret(text) TO service_role;

-- ── Public (jury-facing) RPC grants ─────────────────────────

GRANT EXECUTE ON FUNCTION public.rpc_list_semesters() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_get_current_semester() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_list_projects(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_upsert_score(uuid, uuid, uuid, text, jsonb, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_create_or_get_juror_and_issue_pin(uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_verify_juror_pin(uuid, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_get_juror_edit_state(uuid, uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_finalize_juror_submission(uuid, uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_verify_semester_entry_token(text) TO anon, authenticated;

-- ── v2 Admin RPC grants (JWT-based) ────────────────────────

-- Auth helpers
GRANT EXECUTE ON FUNCTION public._assert_tenant_admin(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public._assert_semester_access(uuid) TO anon, authenticated;

-- Score & analytics (010)
GRANT EXECUTE ON FUNCTION public.rpc_admin_scores_get(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_project_summary(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_outcome_trends(uuid[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_delete_counts(text, uuid) TO anon, authenticated;

-- Settings (011)
GRANT EXECUTE ON FUNCTION public.rpc_admin_settings_get(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_setting_set(uuid, text, text) TO anon, authenticated;

-- Audit (011)
GRANT EXECUTE ON FUNCTION public.rpc_admin_audit_list(uuid, timestamptz, timestamptz, text[], text[], text, integer, integer, integer, integer, timestamptz, uuid) TO anon, authenticated;

-- Tokens (011)
GRANT EXECUTE ON FUNCTION public.rpc_admin_entry_token_generate(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_entry_token_revoke(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_entry_token_status(uuid) TO anon, authenticated;

-- Export (011)
GRANT EXECUTE ON FUNCTION public.rpc_admin_export_full(uuid, text) TO anon, authenticated;

-- ── v1 Admin RPC grants (password-based, legacy compat) ────

-- Auth & password (012)
GRANT EXECUTE ON FUNCTION public.rpc_admin_login(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_security_state() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_change_password(text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_bootstrap_password(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_change_delete_password(text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_bootstrap_delete_password(text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_change_backup_password(text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_bootstrap_backup_password(text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public._assert_backup_password(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public._assert_delete_password(text) TO anon, authenticated;

-- Score & analytics (010 v1)
GRANT EXECUTE ON FUNCTION public.rpc_admin_get_scores(uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_project_summary(uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_outcome_trends(uuid[], text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_delete_counts(text, uuid, text, text) TO anon, authenticated;

-- Settings (011 v1)
GRANT EXECUTE ON FUNCTION public.rpc_admin_get_settings(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_set_setting(text, text, text, text) TO anon, authenticated;

-- Audit (011 v1)
GRANT EXECUTE ON FUNCTION public.rpc_admin_list_audit_logs(text, timestamptz, timestamptz, text[], text[], text, integer, integer, integer, integer, timestamptz, uuid, text) TO anon, authenticated;

-- Tokens (011 v1)
GRANT EXECUTE ON FUNCTION public.rpc_admin_generate_entry_token(uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_revoke_entry_token(uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_get_entry_token_status(uuid, text, text) TO anon, authenticated;

-- Export/Import (011 v1)
GRANT EXECUTE ON FUNCTION public.rpc_admin_full_export(text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_full_import(text, text, jsonb, text) TO anon, authenticated;

-- Semester management (from existing bootstrap RPCs)
GRANT EXECUTE ON FUNCTION public.rpc_admin_set_current_semester(uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_create_semester(text, date, jsonb, jsonb, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_update_semester(uuid, text, date, jsonb, jsonb, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_delete_semester(uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_set_semester_eval_lock(uuid, boolean, text, text) TO anon, authenticated;

-- Project management
GRANT EXECUTE ON FUNCTION public.rpc_admin_list_projects(uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_create_project(uuid, integer, text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_upsert_project(uuid, integer, text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_delete_project(uuid, text, text) TO anon, authenticated;

-- Juror management
GRANT EXECUTE ON FUNCTION public.rpc_admin_create_juror(text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_update_juror(uuid, text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_delete_juror(uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_reset_juror_pin(uuid, uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_list_jurors(text, uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_set_juror_edit_mode(uuid, uuid, boolean, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_force_close_juror_edit_mode(uuid, uuid, text, text) TO anon, authenticated;

-- v2 semester management
GRANT EXECUTE ON FUNCTION public.rpc_admin_semester_set_current(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_semester_set_eval_lock(uuid, boolean) TO anon, authenticated;
