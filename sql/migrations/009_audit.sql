-- VERA v1 — Audit System: Backfills, Auth Failure RPC, Hash Chain, Anomaly Cron
-- Depends on: 002_tables.sql (audit_logs table + ENUMs + row_hash/correlation_id columns)
--             003_helpers_and_triggers.sql (trigger_audit_log, trigger functions)
--             004_rls.sql (audit_logs append-only policy)
--             005_rpcs.sql (_audit_write, rpc_admin_write_audit_event)

-- =============================================================================
-- 1) IDEMPOTENT BACKFILLS
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1a. Backfill: periodName into evaluation.complete + edit_mode_closed rows
-- (042) Rows that only stored period_id (UUID) but never the human-readable name.
-- Safe to re-run: WHERE NOT (details ? 'periodName') is idempotent.
-- -----------------------------------------------------------------------------

UPDATE audit_logs
SET details = details || jsonb_build_object('periodName', p.name)
FROM periods p
WHERE audit_logs.action IN (
  'evaluation.complete',
  'juror.edit_mode_closed_on_resubmit'
)
  AND audit_logs.details ? 'period_id'
  AND NOT (audit_logs.details ? 'periodName')
  AND p.id = (audit_logs.details->>'period_id')::UUID;

-- -----------------------------------------------------------------------------
-- 1b. Backfill: category, severity, actor_type, actor_name for all existing rows
-- (044) New rows are written with these columns populated directly by _audit_write.
-- WHERE category IS NULL makes this idempotent — only touches un-tagged rows.
-- -----------------------------------------------------------------------------

UPDATE audit_logs
SET
  category = CASE
    -- auth
    WHEN action IN ('admin.login') THEN 'auth'::audit_category

    -- access
    WHEN action IN (
      'admin.create','admin.updated',
      'memberships.insert','memberships.update','memberships.delete',
      'admin_invites.insert','admin_invites.update','admin_invites.delete'
    ) THEN 'access'::audit_category

    -- config
    WHEN action IN (
      'criteria.save','criteria.update',
      'outcome.create','outcome.update','outcome.delete',
      'organization.status_changed',
      'frameworks.insert','frameworks.update','frameworks.delete'
    ) THEN 'config'::audit_category

    -- security
    WHEN action IN (
      'token.generate','token.revoke',
      'export.scores','export.rankings','export.heatmap',
      'export.analytics','export.audit','export.backup',
      'notification.application','notification.admin_invite',
      'notification.entry_token','notification.juror_pin',
      'notification.export_report','notification.password_reset',
      'backup.created','backup.deleted','backup.downloaded',
      'entry_tokens.insert','entry_tokens.update','entry_tokens.delete'
    ) THEN 'security'::audit_category

    -- data (period/juror/project/score/evaluation/trigger CRUD)
    ELSE 'data'::audit_category
  END,

  severity = CASE
    -- critical
    WHEN action IN ('juror.pin_locked','juror.blocked') THEN 'critical'::audit_severity

    -- high
    WHEN action IN (
      'period.lock','period.unlock',
      'project.delete',
      'organization.status_changed',
      'backup.deleted',
      'frameworks.delete',
      'memberships.delete'
    ) THEN 'high'::audit_severity

    -- medium
    WHEN action IN (
      'admin.create',
      'pin.reset','juror.pin_unlocked','juror.edit_mode_enabled','juror.edit_enabled',
      'period.set_current',
      'snapshot.freeze',
      'application.approved','application.rejected',
      'token.revoke',
      'export.audit',
      'backup.downloaded',
      'criteria.save','criteria.update',
      'outcome.create','outcome.update','outcome.delete',
      'frameworks.update'
    ) THEN 'medium'::audit_severity

    -- low
    WHEN action IN (
      'admin.updated',
      'juror.edit_mode_closed_on_resubmit',
      'token.generate',
      'export.scores','export.rankings','export.heatmap','export.analytics','export.backup',
      'backup.created',
      'frameworks.insert',
      'admin_invites.insert',
      'memberships.insert','memberships.update'
    ) THEN 'low'::audit_severity

    -- info (default for everything else)
    ELSE 'info'::audit_severity
  END,

  actor_type = CASE
    -- juror-initiated
    WHEN action IN (
      'evaluation.complete',
      'score.update',
      'score_sheets.insert','score_sheets.update','score_sheets.delete'
    ) THEN 'juror'::audit_actor_type

    -- system/trigger generated
    WHEN action IN (
      'snapshot.freeze',
      'juror.pin_locked',
      'juror.edit_mode_closed_on_resubmit',
      'projects.insert','projects.update','projects.delete',
      'jurors.insert','jurors.update','jurors.delete',
      'periods.insert','periods.update','periods.delete',
      'profiles.insert','profiles.update',
      'org_applications.insert','org_applications.update','org_applications.delete',
      'organizations.insert','organizations.update',
      'admin_invites.update'
    ) THEN 'system'::audit_actor_type

    -- anonymous
    WHEN action IN ('application.submitted') THEN 'anonymous'::audit_actor_type

    -- admin (default)
    ELSE 'admin'::audit_actor_type
  END,

  -- Pull actor_name from details if already stored
  actor_name = COALESCE(
    details->>'actor_name',
    details->>'adminName',
    actor_name   -- keep existing if already set
  )

WHERE category IS NULL;  -- only rows not yet backfilled (idempotent)

-- =============================================================================
-- 2) AUTH FAILURE RPC (anon-callable, rate-limited)
-- =============================================================================
-- Anonymous-callable RPC to log failed admin login attempts.
-- Auth failures have no auth.uid() — normal authenticated RPCs cannot be used.
--
-- Rate-limited: max 20 failures per email per 5 minutes to prevent
-- audit table flooding from brute-force attacks.
-- Severity escalation: low (1–2), medium (3–4), high (5+).

CREATE OR REPLACE FUNCTION public.rpc_write_auth_failure_event(
  p_email  TEXT,
  p_method TEXT DEFAULT 'password'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_failure_count INT;
  v_severity      audit_severity;
BEGIN
  -- Sanitise inputs
  IF p_email IS NULL OR length(trim(p_email)) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'invalid_email');
  END IF;

  -- Rate limit: count failures for this email in the last 5 minutes
  SELECT COUNT(*) INTO v_failure_count
  FROM audit_logs
  WHERE action     = 'auth.admin.login.failure'
    AND actor_name = trim(p_email)
    AND created_at > NOW() - INTERVAL '5 minutes';

  -- Reject if rate limit exceeded (20 per 5 min per email)
  IF v_failure_count >= 20 THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'rate_limited');
  END IF;

  -- Severity escalates with repeated failures
  v_severity := CASE
    WHEN v_failure_count >= 4 THEN 'high'
    WHEN v_failure_count >= 2 THEN 'medium'
    ELSE                           'low'
  END::audit_severity;

  INSERT INTO audit_logs (
    organization_id,
    user_id,
    action,
    category,
    severity,
    actor_type,
    actor_name,
    details
  ) VALUES (
    NULL,
    NULL,
    'auth.admin.login.failure',
    'auth'::audit_category,
    v_severity,
    'anonymous'::audit_actor_type,
    trim(p_email),
    jsonb_build_object(
      'email',   trim(p_email),
      'method',  coalesce(p_method, 'password'),
      'attempt', v_failure_count + 1
    )
  );

  RETURN jsonb_build_object('ok', true, 'severity', v_severity::TEXT);
END;
$$;

-- Allow both unauthenticated browser (anon) and authenticated callers.
GRANT EXECUTE ON FUNCTION public.rpc_write_auth_failure_event(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.rpc_write_auth_failure_event(TEXT, TEXT) TO authenticated;

-- =============================================================================
-- 3) HASH CHAIN TAMPER EVIDENCE
-- =============================================================================
-- Each new audit_logs row's hash covers: id, action, organization_id, created_at,
-- and the previous row's hash (for the same org). Any deletion or modification of
-- a past row invalidates all subsequent hashes.
--
-- Note: concurrent inserts within the same millisecond may share the same
-- prev_hash (fork), which is acceptable for VERA's low-concurrency audit volume.
-- Rows inserted before this trigger was created have row_hash = NULL
-- and are treated as "pre-chain era".
--
-- row_hash column is defined in 002_tables.sql (TEXT, nullable).

-- -----------------------------------------------------------------------------
-- 3a. Trigger function: compute and attach SHA-256 chain hash on each INSERT
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.audit_logs_compute_hash()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_prev_hash   TEXT;
  v_chain_input TEXT;
BEGIN
  -- Find the hash of the most recent row for the same organization_id.
  -- IS NOT DISTINCT FROM handles NULL org_id (super-admin events) correctly.
  SELECT row_hash INTO v_prev_hash
  FROM audit_logs
  WHERE organization_id IS NOT DISTINCT FROM NEW.organization_id
    AND row_hash IS NOT NULL
  ORDER BY created_at DESC, id DESC
  LIMIT 1;

  -- Build the chain input: chain breaks if any field is tampered.
  v_chain_input :=
    NEW.id::text                                    ||
    NEW.action                                      ||
    COALESCE(NEW.organization_id::text, '')         ||
    NEW.created_at::text                            ||
    COALESCE(v_prev_hash, 'GENESIS');

  NEW.row_hash := encode(sha256(v_chain_input::bytea), 'hex');
  RETURN NEW;
END;
$$;

-- Idempotent trigger setup
DROP TRIGGER IF EXISTS audit_logs_hash_chain ON audit_logs;

CREATE TRIGGER audit_logs_hash_chain
  BEFORE INSERT ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.audit_logs_compute_hash();

-- -----------------------------------------------------------------------------
-- 3b. _audit_verify_chain_internal — auth-free verification helper
-- Extracted from rpc_admin_verify_audit_chain so that
-- audit-anomaly-sweep (service_role, uid=NULL) can call it without triggering
-- the "Not authenticated" guard that protects the public RPC.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public._audit_verify_chain_internal(
  p_org_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_broken      JSONB := '[]'::JSONB;
  v_prev_hash   TEXT  := 'GENESIS';
  v_row         RECORD;
  v_expected    TEXT;
  v_chain_input TEXT;
BEGIN
  FOR v_row IN
    SELECT id, action, organization_id, created_at, row_hash
    FROM audit_logs
    WHERE organization_id IS NOT DISTINCT FROM p_org_id
      AND row_hash IS NOT NULL
    ORDER BY created_at ASC, id ASC
  LOOP
    v_chain_input :=
      v_row.id::text                                       ||
      v_row.action                                         ||
      COALESCE(v_row.organization_id::text, '')            ||
      v_row.created_at::text                               ||
      v_prev_hash;

    v_expected := encode(sha256(v_chain_input::bytea), 'hex');

    IF v_row.row_hash IS DISTINCT FROM v_expected THEN
      v_broken := v_broken || jsonb_build_array(
        jsonb_build_object(
          'id',         v_row.id,
          'created_at', v_row.created_at,
          'action',     v_row.action,
          'stored',     v_row.row_hash,
          'expected',   v_expected
        )
      );
    END IF;

    -- Advance using stored hash so a forged hash propagates the break forward
    v_prev_hash := v_row.row_hash;
  END LOOP;

  RETURN v_broken;
END;
$$;

-- service_role only — UI must go through rpc_admin_verify_audit_chain
GRANT EXECUTE ON FUNCTION public._audit_verify_chain_internal(UUID) TO service_role;

-- -----------------------------------------------------------------------------
-- 3c. rpc_admin_verify_audit_chain — thin authenticated wrapper
-- Delegates to _audit_verify_chain_internal after auth + role check.
-- Returns [] (empty array) when chain is intact; returns broken-link objects otherwise.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.rpc_admin_verify_audit_chain(p_org_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid      UUID;
  v_is_admin BOOLEAN;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM memberships
    WHERE user_id = v_uid
      AND (
        (role = 'super_admin' AND organization_id IS NULL)
        OR (role = 'org_admin' AND organization_id = p_org_id)
      )
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  RETURN public._audit_verify_chain_internal(p_org_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_verify_audit_chain(UUID) TO authenticated;

-- =============================================================================
-- 4) ANOMALY DETECTION CRON JOB
-- =============================================================================
-- Schedule the audit-anomaly-sweep Edge Function hourly via pg_cron + pg_net.
-- The sweep checks for brute-force patterns, chain integrity, and unusual event
-- spikes; results are written back to audit_logs by the Edge Function.
--
-- Requires: pg_cron enabled on the project (Supabase default: enabled).
-- The URL and X-Cron-Secret must match the Edge Function's deployment env vars.
-- Replace <project-ref> and <AUDIT_SWEEP_SECRET> before applying.

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Idempotent: remove existing job before re-scheduling
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'audit-anomaly-sweep-hourly') THEN
    PERFORM cron.unschedule('audit-anomaly-sweep-hourly');
  END IF;
END $$;

SELECT cron.schedule(
  'audit-anomaly-sweep-hourly',
  '0 * * * *',
  $$
  SELECT extensions.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/audit-anomaly-sweep',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Cron-Secret', '<AUDIT_SWEEP_SECRET>'
    ),
    body := '{}'::jsonb
  )
  $$
);
