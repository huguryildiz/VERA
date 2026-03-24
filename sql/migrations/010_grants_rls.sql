-- ============================================================
-- 010_grants_rls.sql
-- All GRANT EXECUTE statements and RLS enablement.
-- Extracted from 000_bootstrap.sql (move-only refactor).
-- ============================================================

-- ── RLS (default deny) ──────────────────────────────────────

ALTER TABLE public.semesters           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jurors              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scores              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.juror_semester_auth ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs          ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'semesters', 'projects', 'jurors',
        'scores', 'settings', 'juror_semester_auth', 'audit_logs'
      )
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I.%I',
      rec.policyname, rec.schemaname, rec.tablename
    );
  END LOOP;
END;
$$;

-- ── Grants ──────────────────────────────────────────────────

GRANT EXECUTE ON FUNCTION public.rpc_list_semesters() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_get_active_semester() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_list_projects(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_upsert_score(uuid, uuid, uuid, text, jsonb, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_create_or_get_juror_and_issue_pin(uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_verify_juror_pin(uuid, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_get_juror_edit_state(uuid, uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_finalize_juror_submission(uuid, uuid, text) TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.rpc_admin_login(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_security_state() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_get_scores(uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_project_summary(uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_outcome_trends(uuid[], text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_set_active_semester(uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_create_semester(text, date, jsonb, jsonb, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_update_semester(uuid, text, date, jsonb, jsonb, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_list_projects(uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_create_project(uuid, integer, text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_upsert_project(uuid, integer, text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_delete_project(uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_delete_counts(text, uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_create_juror(text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_update_juror(uuid, text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_delete_juror(uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_reset_juror_pin(uuid, uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_get_settings(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_set_setting(text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_set_semester_eval_lock(uuid, boolean, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_list_audit_logs(text, timestamptz, timestamptz, text[], text[], text, integer, integer, integer, integer, timestamptz, uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_list_jurors(text, uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_set_juror_edit_mode(uuid, uuid, boolean, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_force_close_juror_edit_mode(uuid, uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_change_password(text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_bootstrap_password(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_change_delete_password(text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_bootstrap_delete_password(text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_delete_semester(uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_full_export(text, text, text) TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public._assert_backup_password(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_bootstrap_backup_password(text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_change_backup_password(text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_full_export(text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_full_import(text, text, jsonb, text) TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.rpc_verify_semester_entry_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_generate_entry_token(uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_revoke_entry_token(uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_get_entry_token_status(uuid, text, text) TO anon, authenticated;
