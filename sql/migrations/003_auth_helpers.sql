-- ============================================================
-- 003_auth_helpers.sql
-- Internal helper functions for both auth layers.
--
-- v1 helpers: password/rpc_secret based (legacy admin flow)
-- v2 helpers: JWT/auth.uid() based (Phase C admin flow)
-- ============================================================

-- ── v1: Audit log helper ───────────────────────────────────

CREATE OR REPLACE FUNCTION public._audit_log(
  p_actor_type  text,
  p_actor_id    uuid,
  p_action      text,
  p_entity_type text,
  p_entity_id   uuid,
  p_message     text,
  p_metadata    jsonb DEFAULT NULL,
  p_tenant_id   uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  INSERT INTO audit_logs (
    actor_type, actor_id, action, entity_type,
    entity_id, message, metadata, tenant_id
  )
  VALUES (
    COALESCE(NULLIF(trim(p_actor_type), ''), 'system'),
    p_actor_id,
    COALESCE(NULLIF(trim(p_action), ''), 'unknown'),
    COALESCE(NULLIF(trim(p_entity_type), ''), 'unknown'),
    p_entity_id,
    COALESCE(NULLIF(trim(p_message), ''), 'Audit event.'),
    p_metadata,
    p_tenant_id
  );
END;
$$;

-- ── v1: RPC secret verification ────────────────────────────

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

-- ── v1: Juror session assertion ────────────────────────────

CREATE OR REPLACE FUNCTION public._assert_juror_session(
  p_semester_id  uuid,
  p_juror_id     uuid,
  p_session_token text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_auth juror_semester_auth%ROWTYPE;
  v_now  timestamptz := now();
BEGIN
  IF trim(coalesce(p_session_token, '')) = '' THEN
    RAISE EXCEPTION 'juror_session_missing' USING ERRCODE = 'P0401';
  END IF;

  SELECT * INTO v_auth
  FROM juror_semester_auth a
  WHERE a.semester_id = p_semester_id
    AND a.juror_id    = p_juror_id
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
  SET last_seen_at     = v_now,
      session_expires_at = v_now + interval '12 hours'
  WHERE id = v_auth.id;
END;
$$;

-- ── v1: Admin password verification ────────────────────────

CREATE OR REPLACE FUNCTION public._verify_admin_password(
  p_password   text,
  p_rpc_secret text DEFAULT ''
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_hash text;
BEGIN
  PERFORM public._verify_rpc_secret(p_rpc_secret);

  SELECT value INTO v_hash
  FROM settings
  WHERE key = 'admin_password_hash'
    AND tenant_id IS NULL;

  IF v_hash IS NULL OR v_hash = '' THEN
    RETURN false;
  END IF;

  RETURN crypt(p_password, v_hash) = v_hash;
END;
$$;

-- ── v1: Delete password verification ───────────────────────

CREATE OR REPLACE FUNCTION public._verify_delete_password(
  p_password   text,
  p_rpc_secret text DEFAULT ''
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_hash text;
BEGIN
  PERFORM public._verify_rpc_secret(p_rpc_secret);

  SELECT value INTO v_hash
  FROM settings
  WHERE key = 'delete_password_hash'
    AND tenant_id IS NULL;

  IF v_hash IS NULL OR v_hash = '' THEN
    RETURN false;
  END IF;

  RETURN crypt(p_password, v_hash) = v_hash;
END;
$$;

CREATE OR REPLACE FUNCTION public._assert_delete_password(
  p_password   text,
  p_rpc_secret text DEFAULT ''
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NOT public._verify_delete_password(p_password, p_rpc_secret) THEN
    RAISE EXCEPTION 'unauthorized'
      USING ERRCODE = 'P0401';
  END IF;
END;
$$;

-- ── v1: Backup password assertion ──────────────────────────

CREATE OR REPLACE FUNCTION public._assert_backup_password(
  p_password   text,
  p_rpc_secret text DEFAULT ''
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_hash text;
BEGIN
  PERFORM public._verify_rpc_secret(p_rpc_secret);

  SELECT value INTO v_hash
  FROM settings
  WHERE key = 'backup_password_hash'
    AND tenant_id IS NULL;

  IF v_hash IS NULL OR v_hash = '' THEN
    RAISE EXCEPTION 'unauthorized: backup password not set'
      USING ERRCODE = 'P0401';
  END IF;

  IF crypt(p_password, v_hash) <> v_hash THEN
    RAISE EXCEPTION 'unauthorized'
      USING ERRCODE = 'P0401';
  END IF;
END;
$$;

-- ════════════════════════════════════════════════════════════
-- v2 helpers: JWT-based auth (Phase C)
-- ════════════════════════════════════════════════════════════

-- ── v2: Extract authenticated user ID ──────────────────────

CREATE OR REPLACE FUNCTION public._get_auth_user_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = 'P0401';
  END IF;
  RETURN v_uid;
END;
$$;

-- ── v2: Check super-admin status (no raise) ────────────────

CREATE OR REPLACE FUNCTION public._is_super_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM tenant_admin_memberships
    WHERE user_id = p_user_id
      AND role = 'super_admin'
      AND tenant_id IS NULL
  );
END;
$$;

-- ── v2: Assert super-admin (raises on failure) ─────────────

CREATE OR REPLACE FUNCTION public._assert_super_admin()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
BEGIN
  v_uid := public._get_auth_user_id();
  IF NOT public._is_super_admin(v_uid) THEN
    RAISE EXCEPTION 'unauthorized: super_admin required'
      USING ERRCODE = 'P0401';
  END IF;
  RETURN v_uid;
END;
$$;

-- ── v2: Assert tenant admin access ─────────────────────────

CREATE OR REPLACE FUNCTION public._assert_tenant_admin(p_tenant_id uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid    uuid;
  v_status text;
BEGIN
  v_uid := public._get_auth_user_id();

  -- Super-admin has global access
  IF public._is_super_admin(v_uid) THEN
    -- Still verify tenant exists and is active
    SELECT status INTO v_status FROM tenants WHERE id = p_tenant_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'tenant_not_found' USING ERRCODE = 'P0401';
    END IF;
    IF v_status <> 'active' THEN
      RAISE EXCEPTION 'tenant_disabled' USING ERRCODE = 'P0401';
    END IF;
    RETURN v_uid;
  END IF;

  -- Tenant admin: check membership + tenant status
  IF NOT EXISTS (
    SELECT 1
    FROM tenant_admin_memberships m
    JOIN tenants t ON t.id = m.tenant_id
    WHERE m.user_id   = v_uid
      AND m.tenant_id = p_tenant_id
      AND m.role      = 'tenant_admin'
      AND t.status    = 'active'
  ) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = 'P0401';
  END IF;

  RETURN v_uid;
END;
$$;

-- ── v2: Get tenant for a semester ──────────────────────────

CREATE OR REPLACE FUNCTION public._get_semester_tenant(p_semester_id uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
BEGIN
  SELECT tenant_id INTO v_tenant_id
  FROM semesters
  WHERE id = p_semester_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'semester_not_found' USING ERRCODE = 'P0401';
  END IF;

  RETURN v_tenant_id;
END;
$$;

-- ── v2: Assert access via semester (shorthand) ─────────────

CREATE OR REPLACE FUNCTION public._assert_semester_access(p_semester_id uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
BEGIN
  v_tenant_id := public._get_semester_tenant(p_semester_id);
  RETURN public._assert_tenant_admin(v_tenant_id);
END;
$$;
