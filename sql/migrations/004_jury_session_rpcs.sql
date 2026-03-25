-- ============================================================
-- 004_jury_session_rpcs.sql
-- Jury session RPCs with canonical column names.
-- Renames: semesters.name→semester_name, is_active→is_current,
--          tenants.name→short_label.
-- juror_semester_auth rows now include tenant_id.
-- jurors has NO email column.
-- RPCs: rpc_create_or_get_juror_and_issue_pin,
--       rpc_verify_juror_pin, rpc_get_juror_edit_state,
--       rpc_finalize_juror_submission
-- ============================================================

-- ── Juror: read effective edit state ────────────────────────
DROP FUNCTION IF EXISTS public.rpc_get_juror_edit_state(uuid, uuid);
DROP FUNCTION IF EXISTS public.rpc_get_juror_edit_state(uuid, uuid, text);
CREATE OR REPLACE FUNCTION public.rpc_get_juror_edit_state(
  p_semester_id uuid,
  p_juror_id uuid,
  p_session_token text
)
RETURNS TABLE (
  edit_enabled boolean,
  edit_allowed boolean,
  lock_active boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_lock boolean := false;
  v_enabled boolean := false;
  v_sem_current boolean := false;
BEGIN
  PERFORM public._assert_juror_session(p_semester_id, p_juror_id, p_session_token);

  SELECT s.is_current, COALESCE(s.is_locked, false)
    INTO v_sem_current, v_lock
  FROM semesters s
  WHERE s.id = p_semester_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, false, false;
    RETURN;
  END IF;

  -- If semester is not current, signal a lock to the frontend
  IF NOT v_sem_current THEN
    RETURN QUERY SELECT false, false, true;
    RETURN;
  END IF;

  SELECT a.edit_enabled
    INTO v_enabled
  FROM juror_semester_auth a
  WHERE a.juror_id = p_juror_id
    AND a.semester_id = p_semester_id;

  v_enabled := COALESCE(v_enabled, false);

  RETURN QUERY
    SELECT
      v_enabled,
      (v_enabled AND NOT v_lock),
      v_lock;
END;
$$;

-- ── Juror: finalize submission and auto-disable edit ────────
DROP FUNCTION IF EXISTS public.rpc_finalize_juror_submission(uuid, uuid);
DROP FUNCTION IF EXISTS public.rpc_finalize_juror_submission(uuid, uuid, text);
CREATE OR REPLACE FUNCTION public.rpc_finalize_juror_submission(
  p_semester_id uuid,
  p_juror_id uuid,
  p_session_token text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_total int := 0;
  v_completed int := 0;
  v_now timestamptz := now();
  v_juror_name text;
  v_sem_name   text;
  v_sem_locked boolean := false;
BEGIN
  PERFORM public._assert_juror_session(p_semester_id, p_juror_id, p_session_token);

  SELECT COALESCE(s.is_locked, false)
    INTO v_sem_locked
  FROM semesters s
  WHERE s.id = p_semester_id
    AND s.is_current = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'semester_inactive';
  END IF;

  IF v_sem_locked THEN
    RAISE EXCEPTION 'semester_locked';
  END IF;

  SELECT COUNT(*)::int INTO v_total
  FROM projects p
  WHERE p.semester_id = p_semester_id;

  SELECT COUNT(*)::int INTO v_completed
  FROM scores sc
  WHERE sc.semester_id = p_semester_id
    AND sc.juror_id = p_juror_id
    AND sc.criteria_scores IS NOT NULL
    AND sc.criteria_scores <> '{}'::jsonb;

  IF v_total = 0 OR v_completed < v_total THEN
    RETURN false;
  END IF;

  UPDATE juror_semester_auth
  SET edit_enabled = false
  WHERE juror_id = p_juror_id
    AND semester_id = p_semester_id;

  -- Stamp final submission time for all score rows (server time)
  UPDATE scores
  SET final_submitted_at = v_now
  WHERE juror_id = p_juror_id
    AND semester_id = p_semester_id;

  SELECT juror_name INTO v_juror_name FROM jurors WHERE id = p_juror_id;
  SELECT semester_name INTO v_sem_name FROM semesters WHERE id = p_semester_id;
  PERFORM public._audit_log(
    'juror',
    p_juror_id,
    'juror_finalize_submission',
    'semester',
    p_semester_id,
    format('Juror %s finalized submission (%s).', COALESCE(v_juror_name, p_juror_id::text), COALESCE(v_sem_name, p_semester_id::text)),
    null
  );

  RETURN true;
END;
$$;

-- ── Juror auth: create or get juror and issue PIN ───────────
CREATE OR REPLACE FUNCTION public.rpc_create_or_get_juror_and_issue_pin(
  p_semester_id uuid,
  p_juror_name text,
  p_juror_inst text
)
RETURNS TABLE (
  juror_id       uuid,
  juror_name     text,
  juror_inst     text,
  needs_pin      boolean,
  pin_plain_once text,
  locked_until   timestamptz,
  failed_attempts integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
#variable_conflict use_column
DECLARE
  v_norm_name text;
  v_norm_inst text;
  v_juror_id  uuid;
  v_juror_name text;
  v_juror_inst text;
  v_pin text;
  v_pin_hash text;
  v_exists boolean;
  v_constraint text;
  v_locked_until timestamptz;
  v_failed_attempts integer;
  v_pin_plain_once text;
  v_secret text;
  v_reveal_pending boolean := false;
  v_tenant_id uuid;
BEGIN
  v_norm_name := lower(regexp_replace(trim(coalesce(p_juror_name, '')), '\\s+', ' ', 'g'));
  v_norm_inst := lower(regexp_replace(trim(coalesce(p_juror_inst, '')), '\\s+', ' ', 'g'));

  PERFORM pg_advisory_xact_lock(hashtext(v_norm_name || '|' || v_norm_inst));

  -- Look up tenant_id from the semester (needed for juror_semester_auth rows)
  SELECT s.tenant_id INTO v_tenant_id
  FROM semesters s
  WHERE s.id = p_semester_id
    AND s.is_current = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'semester_inactive';
  END IF;

  IF v_norm_name = '' OR v_norm_inst = '' THEN
    RAISE EXCEPTION 'invalid juror identity';
  END IF;

  SELECT j.id, j.juror_name, j.juror_inst
    INTO v_juror_id, v_juror_name, v_juror_inst
  FROM jurors j
  WHERE lower(regexp_replace(trim(coalesce(j.juror_name, '')), '\\s+', ' ', 'g')) = v_norm_name
    AND lower(regexp_replace(trim(coalesce(j.juror_inst, '')), '\\s+', ' ', 'g')) = v_norm_inst
  ORDER BY j.id
  LIMIT 1;

  IF v_juror_id IS NULL THEN
    BEGIN
      INSERT INTO jurors (juror_name, juror_inst)
      VALUES (trim(p_juror_name), trim(p_juror_inst))
      RETURNING id, juror_name, juror_inst
      INTO v_juror_id, v_juror_name, v_juror_inst;
    EXCEPTION WHEN unique_violation THEN
      GET STACKED DIAGNOSTICS v_constraint = CONSTRAINT_NAME;
      IF v_constraint = 'jurors_name_inst_norm_uniq' THEN
        SELECT j.id, j.juror_name, j.juror_inst
          INTO v_juror_id, v_juror_name, v_juror_inst
        FROM jurors j
        WHERE lower(regexp_replace(trim(coalesce(j.juror_name, '')), '\\s+', ' ', 'g')) = v_norm_name
          AND lower(regexp_replace(trim(coalesce(j.juror_inst, '')), '\\s+', ' ', 'g')) = v_norm_inst
        ORDER BY j.id
        LIMIT 1;
      ELSE
        RAISE;
      END IF;
    END;
  END IF;

  SELECT true INTO v_exists
  FROM juror_semester_auth a
  WHERE a.juror_id = v_juror_id
    AND a.semester_id = p_semester_id
  LIMIT 1;

  IF v_exists THEN
    SELECT a.locked_until, a.failed_attempts, a.pin_plain_once, a.pin_reveal_pending
      INTO v_locked_until, v_failed_attempts, v_pin_plain_once, v_reveal_pending
    FROM juror_semester_auth a
    WHERE a.juror_id = v_juror_id
      AND a.semester_id = p_semester_id
    LIMIT 1;

    IF v_reveal_pending THEN
      IF v_pin_plain_once IS NOT NULL AND v_pin_plain_once LIKE 'enc:%' THEN
        SELECT decrypted_secret INTO v_secret
        FROM vault.decrypted_secrets
        WHERE name = 'pin_secret'
        LIMIT 1;
        IF v_secret IS NULL OR v_secret = '' THEN
          RAISE EXCEPTION 'pin_secret_missing';
        END IF;
        v_pin_plain_once := pgp_sym_decrypt(
          decode(substring(v_pin_plain_once from 5), 'base64'),
          v_secret
        );
      END IF;
      IF v_pin_plain_once IS NULL THEN
        -- pin_plain_once is missing despite pin_reveal_pending=true (data corruption).
        -- Generate a new PIN silently and log the recovery for admin forensics.
        PERFORM public._audit_log(
          'system', null::uuid, 'pin_recovery_regen',
          'juror_semester_auth', v_juror_id,
          format('pin_plain_once missing on reveal for juror %s — new PIN generated', v_juror_id),
          jsonb_build_object(
            'juror_id', v_juror_id,
            'semester_id', p_semester_id,
            'reason', 'pin_plain_once_null_on_reveal'
          )
        );
        v_pin := lpad((('x' || encode(gen_random_bytes(2), 'hex'))::bit(16)::int % 10000)::text, 4, '0');
        v_pin_hash := crypt(v_pin, gen_salt('bf'::text));
        v_pin_plain_once := v_pin;
        UPDATE juror_semester_auth
        SET pin_hash = v_pin_hash,
            failed_attempts = 0,
            locked_until = null,
            pin_reveal_pending = false,
            pin_plain_once = null
        WHERE juror_id = v_juror_id
          AND semester_id = p_semester_id;
      ELSE
        UPDATE juror_semester_auth
        SET failed_attempts = 0,
            locked_until = null,
            pin_reveal_pending = false,
            pin_plain_once = null
        WHERE juror_id = v_juror_id
          AND semester_id = p_semester_id;
      END IF;

      RETURN QUERY SELECT null::uuid, v_juror_name, v_juror_inst, false, v_pin_plain_once,
        null::timestamptz, 0;
      RETURN;
    END IF;

    RETURN QUERY SELECT null::uuid, v_juror_name, v_juror_inst, true, null::text,
      v_locked_until, coalesce(v_failed_attempts, 0);
    RETURN;
  END IF;

  v_pin := lpad((('x' || encode(gen_random_bytes(2), 'hex'))::bit(16)::int % 10000)::text, 4, '0');
  v_pin_hash := crypt(v_pin, gen_salt('bf'::text));

  -- Insert with tenant_id looked up from the semester
  INSERT INTO juror_semester_auth (juror_id, semester_id, pin_hash, tenant_id)
  VALUES (v_juror_id, p_semester_id, v_pin_hash, v_tenant_id)
  ON CONFLICT (juror_id, semester_id) DO NOTHING;

  IF NOT FOUND THEN
    RETURN QUERY SELECT null::uuid, v_juror_name, v_juror_inst, true, null::text,
      null::timestamptz, 0;
    RETURN;
  END IF;

  RETURN QUERY SELECT null::uuid, v_juror_name, v_juror_inst, false, v_pin,
    null::timestamptz, 0;
END;
$$;

-- ── Juror auth: verify PIN and issue session token ──────────
DROP FUNCTION IF EXISTS public.rpc_verify_juror_pin(uuid, text, text, text);
CREATE OR REPLACE FUNCTION public.rpc_verify_juror_pin(
  p_semester_id uuid,
  p_juror_name  text,
  p_juror_inst  text,
  p_pin         text
)
RETURNS TABLE (
  ok             boolean,
  juror_id       uuid,
  juror_name     text,
  juror_inst     text,
  error_code     text,
  locked_until   timestamptz,
  failed_attempts integer,
  pin_plain_once  text,
  session_token   text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
#variable_conflict use_column
DECLARE
  v_norm_name text;
  v_norm_inst text;
  v_pin text;
  v_now timestamptz := now();
  v_juror_id uuid;
  v_juror_name text;
  v_juror_inst text;
  v_auth juror_semester_auth%ROWTYPE;
  v_failed integer;
  v_locked timestamptz;
  v_sem_name text;
  v_pin_plain_once text;
  v_secret text;
  v_session_token text;
BEGIN
  v_norm_name := lower(regexp_replace(trim(coalesce(p_juror_name, '')), '\\s+', ' ', 'g'));
  v_norm_inst := lower(regexp_replace(trim(coalesce(p_juror_inst, '')), '\\s+', ' ', 'g'));
  v_pin := regexp_replace(coalesce(p_pin, ''), '\\s+', '', 'g');

  IF NOT EXISTS (
    SELECT 1 FROM semesters s
    WHERE s.id = p_semester_id
      AND s.is_current = true
  ) THEN
    RETURN QUERY SELECT false, null::uuid, null::text, null::text, 'semester_inactive', null::timestamptz, 0, null::text, null::text;
    RETURN;
  END IF;

  SELECT j.id, j.juror_name, j.juror_inst
    INTO v_juror_id, v_juror_name, v_juror_inst
  FROM jurors j
  WHERE lower(regexp_replace(trim(coalesce(j.juror_name, '')), '\\s+', ' ', 'g')) = v_norm_name
    AND lower(regexp_replace(trim(coalesce(j.juror_inst, '')), '\\s+', ' ', 'g')) = v_norm_inst
  ORDER BY j.id
  LIMIT 1;

  IF v_juror_id IS NULL THEN
    RETURN QUERY SELECT false, null::uuid, null::text, null::text, 'not_found', null::timestamptz, 0, null::text, null::text;
    RETURN;
  END IF;

  SELECT *
    INTO v_auth
  FROM juror_semester_auth a
  WHERE a.juror_id = v_juror_id
    AND a.semester_id = p_semester_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, v_juror_id, v_juror_name, v_juror_inst, 'no_pin', null::timestamptz, 0, null::text, null::text;
    RETURN;
  END IF;

  IF v_auth.locked_until IS NOT NULL AND v_auth.locked_until > v_now THEN
    RETURN QUERY SELECT false, v_juror_id, v_juror_name, v_juror_inst, 'locked', v_auth.locked_until, v_auth.failed_attempts, null::text, null::text;
    RETURN;
  END IF;

  -- Lock window expired: reset attempts so the next failure starts from 1 again.
  IF v_auth.locked_until IS NOT NULL AND v_auth.locked_until <= v_now THEN
    UPDATE juror_semester_auth
    SET failed_attempts = 0,
        locked_until = null
    WHERE id = v_auth.id;
    v_auth.failed_attempts := 0;
    v_auth.locked_until := null;
  END IF;

  IF crypt(v_pin, v_auth.pin_hash) = v_auth.pin_hash THEN
    v_pin_plain_once := null::text;
    IF v_auth.pin_reveal_pending AND v_auth.pin_plain_once IS NOT NULL THEN
      IF v_auth.pin_plain_once LIKE 'enc:%' THEN
        SELECT decrypted_secret INTO v_secret
        FROM vault.decrypted_secrets
        WHERE name = 'pin_secret'
        LIMIT 1;
        IF v_secret IS NULL OR v_secret = '' THEN
          RAISE EXCEPTION 'pin_secret_missing';
        END IF;
        v_pin_plain_once := pgp_sym_decrypt(
          decode(substring(v_auth.pin_plain_once from 5), 'base64'),
          v_secret
        );
      ELSE
        v_pin_plain_once := v_auth.pin_plain_once;
      END IF;
    END IF;
    v_session_token := encode(gen_random_bytes(32), 'hex');
    UPDATE juror_semester_auth
    SET last_seen_at = v_now,
        failed_attempts = 0,
        locked_until = null,
        pin_reveal_pending = false,
        pin_plain_once = null,
        session_token_hash = crypt(v_session_token, gen_salt('bf')),
        session_expires_at = v_now + interval '12 hours'
    WHERE id = v_auth.id;

    RETURN QUERY SELECT true, v_juror_id, v_juror_name, v_juror_inst, null::text, null::timestamptz, 0, v_pin_plain_once, v_session_token;
    RETURN;
  END IF;

  v_failed := v_auth.failed_attempts + 1;
  v_locked := null;
  IF v_failed >= 3 THEN
    v_locked := v_now + interval '15 minutes';
  END IF;

  UPDATE juror_semester_auth
  SET failed_attempts = v_failed,
      locked_until = v_locked
  WHERE id = v_auth.id;

  -- Log every failed attempt (not only lockout) for poster-day forensics.
  SELECT semester_name INTO v_sem_name FROM semesters WHERE id = p_semester_id;
  PERFORM public._audit_log(
    'juror',
    v_juror_id,
    CASE WHEN v_locked IS NOT NULL THEN 'juror_pin_locked' ELSE 'juror_pin_failed' END,
    'juror',
    v_juror_id,
    format(
      CASE WHEN v_locked IS NOT NULL
        THEN 'Juror %s PIN locked after too many failed attempts.'
        ELSE 'Juror %s failed PIN attempt %s/3.'
      END,
      COALESCE(v_juror_name, v_juror_id::text),
      v_failed
    ),
    jsonb_build_object(
      'juror_name', v_juror_name,
      'juror_inst', v_juror_inst,
      'semester_id', p_semester_id,
      'semester_name', v_sem_name,
      'failed_attempts', v_failed,
      'locked_until', v_locked
    )
  );

  IF v_locked IS NOT NULL THEN
    RETURN QUERY SELECT false, v_juror_id, v_juror_name, v_juror_inst, 'locked', v_locked, v_failed, null::text, null::text;
  END IF;

  RETURN QUERY SELECT false, v_juror_id, v_juror_name, v_juror_inst, 'invalid', v_locked, v_failed, null::text, null::text;
END;
$$;

-- ── Grants ──────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.rpc_create_or_get_juror_and_issue_pin(uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_verify_juror_pin(uuid, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_get_juror_edit_state(uuid, uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_finalize_juror_submission(uuid, uuid, text) TO anon, authenticated;
