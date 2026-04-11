-- 039_backup_schedule_settings.sql
-- Adds configurable backup schedule.
-- Stores the cron expression in platform_settings and exposes two RPCs:
--   rpc_admin_get_backup_schedule()            → { cron_expr }
--   rpc_admin_set_backup_schedule(p_cron_expr) → { ok: true }
--
-- The setter also reschedules the pg_cron 'auto-backup-daily' job so the
-- change takes effect on the next run.

-- ── Column ────────────────────────────────────────────────────────────────────
ALTER TABLE platform_settings
  ADD COLUMN IF NOT EXISTS backup_cron_expr TEXT NOT NULL DEFAULT '0 2 * * *';

-- ── RPC: get ──────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.rpc_admin_get_backup_schedule()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT current_user_is_super_admin() THEN
    RAISE EXCEPTION 'super_admin required';
  END IF;

  RETURN (
    SELECT jsonb_build_object('cron_expr', backup_cron_expr)
    FROM platform_settings
    WHERE id = 1
  )::JSON;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_get_backup_schedule() TO authenticated;

-- ── RPC: set (also reschedules pg_cron job) ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.rpc_admin_set_backup_schedule(p_cron_expr TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, cron
AS $$
DECLARE
  v_job_sql TEXT;
BEGIN
  IF NOT current_user_is_super_admin() THEN
    RAISE EXCEPTION 'super_admin required';
  END IF;

  -- Basic validation: exactly 5 whitespace-separated fields
  IF array_length(regexp_split_to_array(trim(p_cron_expr), '\s+'), 1) != 5 THEN
    RAISE EXCEPTION 'Invalid cron expression: expected 5 fields';
  END IF;

  -- Persist
  UPDATE platform_settings
  SET backup_cron_expr = trim(p_cron_expr),
      updated_at       = now(),
      updated_by       = auth.uid()
  WHERE id = 1;

  -- Build job SQL (current_setting resolved at execution time, not now)
  v_job_sql :=
    'SELECT net.http_post('
    || 'url := current_setting(''app.settings.supabase_url'', true) || ''/functions/v1/auto-backup'','
    || 'headers := jsonb_build_object('
    || '''Content-Type'', ''application/json'','
    || '''Authorization'', ''Bearer '' || current_setting(''app.settings.service_role_key'', true)'
    || '),'
    || 'body := ''{}''::jsonb'
    || ') AS request_id';

  -- Reschedule (unschedule is a no-op if job doesn't exist)
  PERFORM cron.unschedule('auto-backup-daily');
  PERFORM cron.schedule('auto-backup-daily', trim(p_cron_expr), v_job_sql);

  RETURN jsonb_build_object('ok', true)::JSON;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_set_backup_schedule(TEXT) TO authenticated;
