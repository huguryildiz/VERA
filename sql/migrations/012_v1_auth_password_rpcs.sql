-- ============================================================
-- 012_v1_auth_password_rpcs.sql
-- v1 admin authentication and password management RPCs.
-- Password-based (legacy compat). Canonical column names.
-- ============================================================

-- ── Internal helpers (idempotent re-create) ─────────────────

CREATE OR REPLACE FUNCTION public._verify_rpc_secret(p_provided text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_expected text;
BEGIN
  SELECT decrypted_secret INTO v_expected FROM vault.decrypted_secrets WHERE name = 'rpc_secret' LIMIT 1;
  IF v_expected IS NULL OR v_expected = '' THEN
    RAISE EXCEPTION 'unauthorized: rpc_secret not configured' USING ERRCODE = 'insufficient_privilege'; END IF;
  IF p_provided IS DISTINCT FROM v_expected THEN
    RAISE EXCEPTION 'unauthorized: rpc_secret mismatch' USING ERRCODE = 'insufficient_privilege'; END IF;
END; $$;

CREATE OR REPLACE FUNCTION public._verify_admin_password(p_password text, p_rpc_secret text DEFAULT '')
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_hash text;
BEGIN
  PERFORM public._verify_rpc_secret(p_rpc_secret);
  SELECT value INTO v_hash FROM settings WHERE key = 'admin_password_hash' AND tenant_id IS NULL;
  IF v_hash IS NULL OR v_hash = '' THEN RETURN false; END IF;
  RETURN crypt(p_password, v_hash) = v_hash;
END; $$;

CREATE OR REPLACE FUNCTION public._verify_delete_password(p_password text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_hash text;
BEGIN
  SELECT value INTO v_hash FROM settings WHERE key = 'delete_password_hash' AND tenant_id IS NULL;
  IF v_hash IS NULL OR v_hash = '' THEN RETURN false; END IF;
  RETURN crypt(p_password, v_hash) = v_hash;
END; $$;

CREATE OR REPLACE FUNCTION public._assert_delete_password(p_password text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_hash text;
BEGIN
  SELECT value INTO v_hash FROM settings WHERE key = 'delete_password_hash' AND tenant_id IS NULL;
  IF v_hash IS NULL OR v_hash = '' THEN RAISE EXCEPTION 'delete_password_missing' USING ERRCODE = 'P0401'; END IF;
  IF crypt(p_password, v_hash) <> v_hash THEN RAISE EXCEPTION 'incorrect_delete_password' USING ERRCODE = 'P0401'; END IF;
END; $$;

CREATE OR REPLACE FUNCTION public._assert_backup_password(p_password text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_hash text;
BEGIN
  SELECT value INTO v_hash FROM settings WHERE key = 'backup_password_hash' AND tenant_id IS NULL;
  IF v_hash IS NULL OR v_hash = '' THEN RAISE EXCEPTION 'backup_password_missing' USING ERRCODE = 'P0401'; END IF;
  IF crypt(p_password, v_hash) <> v_hash THEN RAISE EXCEPTION 'incorrect_backup_password' USING ERRCODE = 'P0401'; END IF;
END; $$;

-- ═══════════ Admin login (rate-limited) ═════════════════════

CREATE OR REPLACE FUNCTION public.rpc_admin_login(p_password text, p_rpc_secret text DEFAULT '')
RETURNS TABLE(ok boolean, locked_until timestamptz, failed_attempts integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  v_attempts_str text; v_locked_str text; v_attempts integer;
  v_locked timestamptz; v_new_locked timestamptz; v_now timestamptz := now(); v_ok boolean;
BEGIN
  SELECT value INTO v_attempts_str FROM settings WHERE key = 'admin_failed_attempts' AND tenant_id IS NULL;
  SELECT value INTO v_locked_str FROM settings WHERE key = 'admin_locked_until' AND tenant_id IS NULL;
  v_attempts := COALESCE(v_attempts_str::integer, 0);
  v_locked := CASE WHEN v_locked_str IS NOT NULL AND v_locked_str <> '' THEN v_locked_str::timestamptz ELSE NULL END;
  -- Reject if still locked
  IF v_locked IS NOT NULL AND v_locked > v_now THEN
    RETURN QUERY SELECT false, v_locked, v_attempts; RETURN; END IF;
  -- Lock expired: reset
  IF v_locked IS NOT NULL AND v_locked <= v_now THEN
    INSERT INTO settings (key, value, updated_at) VALUES ('admin_failed_attempts','0',now())
      ON CONFLICT (key) WHERE tenant_id IS NULL DO UPDATE SET value = '0', updated_at = now();
    INSERT INTO settings (key, value, updated_at) VALUES ('admin_locked_until','',now())
      ON CONFLICT (key) WHERE tenant_id IS NULL DO UPDATE SET value = '', updated_at = now();
    v_attempts := 0; v_locked := NULL;
  END IF;
  v_ok := public._verify_admin_password(p_password, p_rpc_secret);
  IF v_ok THEN
    INSERT INTO settings (key, value, updated_at) VALUES ('admin_failed_attempts','0',now())
      ON CONFLICT (key) WHERE tenant_id IS NULL DO UPDATE SET value = '0', updated_at = now();
    INSERT INTO settings (key, value, updated_at) VALUES ('admin_locked_until','',now())
      ON CONFLICT (key) WHERE tenant_id IS NULL DO UPDATE SET value = '', updated_at = now();
    RETURN QUERY SELECT true, null::timestamptz, 0; RETURN;
  END IF;
  v_attempts := v_attempts + 1; v_new_locked := NULL;
  IF v_attempts >= 5 THEN v_new_locked := v_now + interval '15 minutes'; END IF;
  INSERT INTO settings (key, value, updated_at) VALUES ('admin_failed_attempts', v_attempts::text, now())
    ON CONFLICT (key) WHERE tenant_id IS NULL DO UPDATE SET value = v_attempts::text, updated_at = now();
  IF v_new_locked IS NOT NULL THEN
    INSERT INTO settings (key, value, updated_at) VALUES ('admin_locked_until', v_new_locked::text, now())
      ON CONFLICT (key) WHERE tenant_id IS NULL DO UPDATE SET value = v_new_locked::text, updated_at = now();
  END IF;
  PERFORM public._audit_log('system', null::uuid, 'admin_login_failed', 'settings', null::uuid,
    'Admin login failed. Attempt ' || v_attempts || '.' ||
    CASE WHEN v_new_locked IS NOT NULL THEN ' Account locked until ' || v_new_locked::text || '.' ELSE '' END, null);
  RETURN QUERY SELECT false, v_new_locked, v_attempts;
END; $$;

-- ═══════════ Security state ═════════════════════════════════

CREATE OR REPLACE FUNCTION public.rpc_admin_security_state()
RETURNS TABLE (admin_password_set boolean, delete_password_set boolean, backup_password_set boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  RETURN QUERY SELECT
    EXISTS (SELECT 1 FROM settings WHERE key = 'admin_password_hash' AND tenant_id IS NULL AND value IS NOT NULL AND value <> ''),
    EXISTS (SELECT 1 FROM settings WHERE key = 'delete_password_hash' AND tenant_id IS NULL AND value IS NOT NULL AND value <> ''),
    EXISTS (SELECT 1 FROM settings WHERE key = 'backup_password_hash' AND tenant_id IS NULL AND value IS NOT NULL AND value <> '');
END; $$;

-- ═══════════ Change admin password ══════════════════════════

DROP FUNCTION IF EXISTS public.rpc_admin_change_password(text, text);
DROP FUNCTION IF EXISTS public.rpc_admin_change_password(text, text, text);
CREATE OR REPLACE FUNCTION public.rpc_admin_change_password(p_current_password text, p_new_password text, p_rpc_secret text DEFAULT '')
RETURNS TABLE (ok boolean) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_hash text;
BEGIN
  PERFORM public._verify_rpc_secret(p_rpc_secret);
  SELECT value INTO v_hash FROM settings WHERE key = 'admin_password_hash' AND tenant_id IS NULL;
  IF v_hash IS NULL OR v_hash = '' THEN RAISE EXCEPTION 'admin_password_hash_missing'; END IF;
  IF crypt(p_current_password, v_hash) <> v_hash THEN RAISE EXCEPTION 'incorrect_password'; END IF;
  INSERT INTO settings (key, value) VALUES ('admin_password_hash', crypt(p_new_password, gen_salt('bf')))
  ON CONFLICT (key) WHERE tenant_id IS NULL DO UPDATE SET value = EXCLUDED.value, updated_at = now();
  PERFORM public._audit_log('admin', null::uuid, 'admin_password_change', 'settings', null::uuid,
    'Admin changed admin password.', null);
  RETURN QUERY SELECT true;
END; $$;

-- ═══════════ Change delete password ═════════════════════════

CREATE OR REPLACE FUNCTION public.rpc_admin_change_delete_password(
  p_current_password text, p_new_password text, p_admin_password text, p_rpc_secret text DEFAULT ''
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  IF NOT public._verify_admin_password(p_admin_password, p_rpc_secret) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = 'P0401'; END IF;
  PERFORM public._assert_delete_password(p_current_password);
  INSERT INTO settings (key, value) VALUES ('delete_password_hash', crypt(p_new_password, gen_salt('bf')))
  ON CONFLICT (key) WHERE tenant_id IS NULL DO UPDATE SET value = EXCLUDED.value, updated_at = now();
  PERFORM public._audit_log('admin', null::uuid, 'delete_password_change', 'settings', null::uuid,
    'Admin changed delete password.', null);
  RETURN true;
END; $$;

-- ═══════════ Change backup password ═════════════════════════

CREATE OR REPLACE FUNCTION public.rpc_admin_change_backup_password(
  p_current_password text, p_new_password text, p_admin_password text, p_rpc_secret text DEFAULT ''
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  IF NOT public._verify_admin_password(p_admin_password, p_rpc_secret) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = 'P0401'; END IF;
  PERFORM public._assert_backup_password(p_current_password);
  INSERT INTO settings (key, value) VALUES ('backup_password_hash', crypt(p_new_password, gen_salt('bf')))
  ON CONFLICT (key) WHERE tenant_id IS NULL DO UPDATE SET value = EXCLUDED.value, updated_at = now();
  PERFORM public._audit_log('admin', null::uuid, 'backup_password_change', 'settings', null::uuid,
    'Admin changed backup password.', null);
  RETURN true;
END; $$;

-- ═══════════ Bootstrap admin password ═══════════════════════

DROP FUNCTION IF EXISTS public.rpc_admin_bootstrap_password(text);
DROP FUNCTION IF EXISTS public.rpc_admin_bootstrap_password(text, text);
CREATE OR REPLACE FUNCTION public.rpc_admin_bootstrap_password(p_new_password text, p_rpc_secret text DEFAULT '')
RETURNS TABLE (ok boolean) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_hash text;
BEGIN
  PERFORM public._verify_rpc_secret(p_rpc_secret);
  SELECT value INTO v_hash FROM settings WHERE key = 'admin_password_hash' AND tenant_id IS NULL;
  IF v_hash IS NOT NULL AND v_hash <> '' THEN RAISE EXCEPTION 'already_initialized'; END IF;
  INSERT INTO settings (key, value) VALUES ('admin_password_hash', crypt(p_new_password, gen_salt('bf')))
  ON CONFLICT (key) WHERE tenant_id IS NULL DO UPDATE SET value = EXCLUDED.value, updated_at = now();
  PERFORM public._audit_log('admin', null::uuid, 'admin_password_change', 'settings', null::uuid,
    'Admin changed admin password.', null);
  RETURN QUERY SELECT true;
END; $$;

-- ═══════════ Bootstrap delete password ══════════════════════

CREATE OR REPLACE FUNCTION public.rpc_admin_bootstrap_delete_password(
  p_new_password text, p_admin_password text, p_rpc_secret text DEFAULT ''
) RETURNS TABLE (ok boolean) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_hash text;
BEGIN
  IF NOT public._verify_admin_password(p_admin_password, p_rpc_secret) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = 'P0401'; END IF;
  SELECT value INTO v_hash FROM settings WHERE key = 'delete_password_hash' AND tenant_id IS NULL;
  IF v_hash IS NOT NULL AND v_hash <> '' THEN RAISE EXCEPTION 'already_initialized'; END IF;
  INSERT INTO settings (key, value) VALUES ('delete_password_hash', crypt(p_new_password, gen_salt('bf')))
  ON CONFLICT (key) WHERE tenant_id IS NULL DO UPDATE SET value = EXCLUDED.value, updated_at = now();
  PERFORM public._audit_log('admin', null::uuid, 'delete_password_change', 'settings', null::uuid,
    'Admin changed delete password.', null);
  RETURN QUERY SELECT true;
END; $$;

-- ═══════════ Bootstrap backup password ══════════════════════

CREATE OR REPLACE FUNCTION public.rpc_admin_bootstrap_backup_password(
  p_new_password text, p_admin_password text, p_rpc_secret text DEFAULT ''
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_hash text;
BEGIN
  IF NOT public._verify_admin_password(p_admin_password, p_rpc_secret) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = 'P0401'; END IF;
  SELECT value INTO v_hash FROM settings WHERE key = 'backup_password_hash' AND tenant_id IS NULL;
  IF v_hash IS NOT NULL AND v_hash <> '' THEN RAISE EXCEPTION 'already_initialized'; END IF;
  INSERT INTO settings (key, value) VALUES ('backup_password_hash', crypt(p_new_password, gen_salt('bf')))
  ON CONFLICT (key) WHERE tenant_id IS NULL DO UPDATE SET value = EXCLUDED.value, updated_at = now();
  PERFORM public._audit_log('admin', null::uuid, 'backup_password_change', 'settings', null::uuid,
    'Admin initialized backup password.', null);
  RETURN true;
END; $$;
