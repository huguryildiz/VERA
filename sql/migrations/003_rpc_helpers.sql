-- ============================================================
-- 003_rpc_helpers.sql
-- Internal helper functions: _audit_log, _verify_rpc_secret,
-- _assert_juror_session.
-- Extracted from 000_bootstrap.sql (move-only refactor).
-- ============================================================

-- ── Audit helper ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public._audit_log(
  p_actor_type  text,
  p_actor_id    uuid,
  p_action      text,
  p_entity_type text,
  p_entity_id   uuid,
  p_message     text,
  p_metadata    jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  INSERT INTO audit_logs (
    actor_type,
    actor_id,
    action,
    entity_type,
    entity_id,
    message,
    metadata
  )
  VALUES (
    COALESCE(NULLIF(trim(p_actor_type), ''), 'system'),
    p_actor_id,
    COALESCE(NULLIF(trim(p_action), ''), 'unknown'),
    COALESCE(NULLIF(trim(p_entity_type), ''), 'unknown'),
    p_entity_id,
    COALESCE(NULLIF(trim(p_message), ''), 'Audit event.'),
    p_metadata
  );
END;
$$;

-- ── Admin RPCs ──────────────────────────────────────────────

-- RPC secret check (defence-in-depth, DB-side only).
-- The secret is stored in Supabase Vault (name = 'rpc_secret').
-- To enable: add a secret named 'rpc_secret' in Supabase Dashboard > Vault.
-- Fail-closed when not configured — production-safe default.
-- To disable auth checks intentionally, set a temporary explicit secret value.
CREATE OR REPLACE FUNCTION public._verify_rpc_secret(p_provided text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expected text;
BEGIN
  SELECT decrypted_secret INTO v_expected
  FROM vault.decrypted_secrets
  WHERE name = 'rpc_secret'
  LIMIT 1;
  IF v_expected IS NULL OR v_expected = '' THEN
    RAISE EXCEPTION 'unauthorized: rpc_secret not configured'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF p_provided IS DISTINCT FROM v_expected THEN
    RAISE EXCEPTION 'unauthorized: rpc_secret mismatch'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public._verify_rpc_secret(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._verify_rpc_secret(text) TO service_role;

CREATE OR REPLACE FUNCTION public._assert_juror_session(
  p_semester_id uuid,
  p_juror_id uuid,
  p_session_token text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_auth juror_semester_auth%ROWTYPE;
  v_now timestamptz := now();
BEGIN
  IF trim(coalesce(p_session_token, '')) = '' THEN
    RAISE EXCEPTION 'juror_session_missing' USING ERRCODE = 'P0401';
  END IF;

  SELECT *
    INTO v_auth
  FROM juror_semester_auth a
  WHERE a.semester_id = p_semester_id
    AND a.juror_id = p_juror_id
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'juror_session_not_found' USING ERRCODE = 'P0401';
  END IF;

  IF v_auth.session_token_hash IS NULL OR v_auth.session_expires_at IS NULL THEN
    RAISE EXCEPTION 'juror_session_invalid' USING ERRCODE = 'P0401';
  END IF;

  IF v_auth.session_expires_at <= v_now THEN
    RAISE EXCEPTION 'juror_session_expired' USING ERRCODE = 'P0401';
  END IF;

  IF crypt(p_session_token, v_auth.session_token_hash) <> v_auth.session_token_hash THEN
    RAISE EXCEPTION 'juror_session_invalid' USING ERRCODE = 'P0401';
  END IF;

  UPDATE juror_semester_auth
  SET
    last_seen_at = v_now,
    session_expires_at = v_now + interval '12 hours'
  WHERE id = v_auth.id;
END;
$$;
