-- 038_auto_backup_cron.sql
-- Schedules a daily pg_cron job that triggers the auto-backup Edge Function
-- for all active organizations at 02:00 UTC.
--
-- Prerequisites (apply once per project via Supabase Dashboard → SQL Editor):
--   1. pg_net extension must be enabled (Supabase enables this by default).
--   2. The auto-backup Edge Function must be deployed.
--   3. The PostgreSQL settings below must resolve correctly:
--        current_setting('app.settings.supabase_url')   → e.g. https://<ref>.supabase.co
--        current_setting('app.settings.service_role_key') → service role JWT
--      These are injected automatically by Supabase on hosted projects.
--      If current_setting returns NULL, set them manually:
--        ALTER DATABASE postgres SET "app.settings.supabase_url" = 'https://<ref>.supabase.co';
--        ALTER DATABASE postgres SET "app.settings.service_role_key" = '<key>';

CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove any pre-existing job with this name (idempotent)
SELECT cron.unschedule('auto-backup-daily') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'auto-backup-daily'
);

SELECT cron.schedule(
  'auto-backup-daily',
  '0 2 * * *',  -- 02:00 UTC every day
  $$
  SELECT
    net.http_post(
      url     := current_setting('app.settings.supabase_url', true) || '/functions/v1/auto-backup',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body    := '{}'::jsonb
    ) AS request_id;
  $$
);
