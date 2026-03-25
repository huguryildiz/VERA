-- ============================================================
-- 011_admin_support_rpcs.sql
-- Settings, audit, tokens, export/import — v1 + v2 variants.
-- Canonical column names: semester_name, is_current, short_label.
-- ============================================================

-- ═══════════ SETTINGS v2 (JWT) ══════════════════════════════

CREATE OR REPLACE FUNCTION public.rpc_admin_settings_get(p_tenant_id uuid)
RETURNS TABLE (key text, value text) LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions AS $$
#variable_conflict use_column
BEGIN
  PERFORM public._assert_tenant_admin(p_tenant_id);
  RETURN QUERY SELECT s.key, s.value FROM settings s
    WHERE (s.tenant_id = p_tenant_id OR s.tenant_id IS NULL)
      AND s.key NOT IN ('pin_secret','rpc_secret','admin_password_hash','delete_password_hash','backup_password_hash')
    ORDER BY s.key;
END; $$;

CREATE OR REPLACE FUNCTION public.rpc_admin_setting_set(p_tenant_id uuid, p_key text, p_value text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  PERFORM public._assert_tenant_admin(p_tenant_id);
  INSERT INTO settings (key, tenant_id, value) VALUES (p_key, p_tenant_id, p_value)
  ON CONFLICT (key, COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid))
    DO UPDATE SET value = EXCLUDED.value, updated_at = now();
  PERFORM public._audit_log('admin', auth.uid(), 'setting_change', 'settings', null::uuid,
    format('Admin changed setting %s.', COALESCE(NULLIF(trim(p_key), ''), '?')),
    jsonb_build_object('key', p_key, 'tenant_id', p_tenant_id));
  RETURN true;
END; $$;

-- ═══════════ SETTINGS v1 (password) ═════════════════════════

CREATE OR REPLACE FUNCTION public.rpc_admin_get_settings(p_admin_password text, p_rpc_secret text DEFAULT '')
RETURNS TABLE (key text, value text) LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions AS $$
#variable_conflict use_column
BEGIN
  IF NOT public._verify_admin_password(p_admin_password, p_rpc_secret) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = 'P0401'; END IF;
  RETURN QUERY SELECT s.key, s.value FROM settings s
    WHERE s.key NOT IN ('pin_secret','rpc_secret','admin_password_hash','delete_password_hash','backup_password_hash')
    ORDER BY s.key;
END; $$;

CREATE OR REPLACE FUNCTION public.rpc_admin_set_setting(p_key text, p_value text, p_admin_password text, p_rpc_secret text DEFAULT '')
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
#variable_conflict use_column
BEGIN
  IF NOT public._verify_admin_password(p_admin_password, p_rpc_secret) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = 'P0401'; END IF;
  INSERT INTO settings (key, value) VALUES (p_key, p_value)
  ON CONFLICT (key) WHERE tenant_id IS NULL DO UPDATE SET value = EXCLUDED.value, updated_at = now();
  PERFORM public._audit_log('admin', null::uuid, 'setting_change', 'settings', null::uuid,
    format('Admin changed setting %s.', COALESCE(NULLIF(trim(p_key), ''), '?')),
    jsonb_build_object('key', p_key));
  RETURN true;
END; $$;

-- ═══════════ AUDIT v2 (JWT, tenant-scoped) ══════════════════

CREATE OR REPLACE FUNCTION public.rpc_admin_audit_list(
  p_tenant_id uuid, p_start_at timestamptz DEFAULT NULL, p_end_at timestamptz DEFAULT NULL,
  p_actor_types text[] DEFAULT NULL, p_actions text[] DEFAULT NULL, p_search text DEFAULT NULL,
  p_search_day integer DEFAULT NULL, p_search_month integer DEFAULT NULL,
  p_search_year integer DEFAULT NULL, p_limit integer DEFAULT 100,
  p_before_at timestamptz DEFAULT NULL, p_before_id uuid DEFAULT NULL
) RETURNS TABLE (
  id uuid, created_at timestamptz, actor_type text, actor_id uuid, action text,
  entity_type text, entity_id uuid, message text, metadata jsonb
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_lim integer; v_at text[]; v_ac text[]; v_s text;
BEGIN
  PERFORM public._assert_tenant_admin(p_tenant_id);
  v_lim := GREATEST(1, LEAST(COALESCE(p_limit, 100), 500));
  v_at := array_remove(p_actor_types, '');
  v_ac := array_remove(p_actions, '');
  IF v_at IS NOT NULL AND array_length(v_at, 1) IS NULL THEN v_at := NULL; END IF;
  IF v_ac IS NOT NULL AND array_length(v_ac, 1) IS NULL THEN v_ac := NULL; END IF;
  v_s := NULLIF(btrim(p_search), '');
  RETURN QUERY SELECT a.id, a.created_at, a.actor_type, a.actor_id, a.action,
    a.entity_type, a.entity_id, a.message, a.metadata
  FROM audit_logs a
  WHERE (a.tenant_id = p_tenant_id OR a.tenant_id IS NULL)
    AND (p_start_at IS NULL OR a.created_at >= p_start_at)
    AND (p_end_at IS NULL OR a.created_at <= p_end_at)
    AND (v_at IS NULL OR a.actor_type = ANY(v_at))
    AND (v_ac IS NULL OR a.action = ANY(v_ac))
    AND (v_s IS NULL OR a.message ILIKE '%'||v_s||'%' OR a.entity_type ILIKE '%'||v_s||'%'
      OR a.action ILIKE '%'||v_s||'%' OR a.metadata::text ILIKE '%'||v_s||'%'
      OR (p_search_day IS NOT NULL AND p_search_month IS NOT NULL
          AND EXTRACT(DAY FROM a.created_at) = p_search_day AND EXTRACT(MONTH FROM a.created_at) = p_search_month
          AND (p_search_year IS NULL OR EXTRACT(YEAR FROM a.created_at) = p_search_year))
      OR (p_search_day IS NULL AND p_search_month IS NOT NULL
          AND EXTRACT(MONTH FROM a.created_at) = p_search_month
          AND (p_search_year IS NULL OR EXTRACT(YEAR FROM a.created_at) = p_search_year)))
    AND (p_before_at IS NULL OR a.created_at < p_before_at
      OR (a.created_at = p_before_at AND (p_before_id IS NULL OR a.id < p_before_id)))
  ORDER BY a.created_at DESC, a.id DESC LIMIT v_lim;
END; $$;

-- ═══════════ AUDIT v1 (password) ════════════════════════════

DROP FUNCTION IF EXISTS public.rpc_admin_list_audit_logs(text, timestamptz, timestamptz, text[], text[], integer);
DROP FUNCTION IF EXISTS public.rpc_admin_list_audit_logs(text, timestamptz, timestamptz, text[], text[], text, integer);
DROP FUNCTION IF EXISTS public.rpc_admin_list_audit_logs(text, timestamptz, timestamptz, text[], text[], text, integer, timestamptz, uuid);
DROP FUNCTION IF EXISTS public.rpc_admin_list_audit_logs(text, timestamptz, timestamptz, text[], text[], text, integer, integer, integer, integer, timestamptz, uuid);
DROP FUNCTION IF EXISTS public.rpc_admin_list_audit_logs(text, timestamptz, timestamptz, text[], text[], integer, timestamptz, uuid);
CREATE OR REPLACE FUNCTION public.rpc_admin_list_audit_logs(
  p_admin_password text, p_start_at timestamptz DEFAULT NULL, p_end_at timestamptz DEFAULT NULL,
  p_actor_types text[] DEFAULT NULL, p_actions text[] DEFAULT NULL, p_search text DEFAULT NULL,
  p_search_day integer DEFAULT NULL, p_search_month integer DEFAULT NULL,
  p_search_year integer DEFAULT NULL, p_limit integer DEFAULT 100,
  p_before_at timestamptz DEFAULT NULL, p_before_id uuid DEFAULT NULL, p_rpc_secret text DEFAULT ''
) RETURNS TABLE (
  id uuid, created_at timestamptz, actor_type text, actor_id uuid, action text,
  entity_type text, entity_id uuid, message text, metadata jsonb
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_lim integer; v_at text[]; v_ac text[]; v_s text;
BEGIN
  IF NOT public._verify_admin_password(p_admin_password, p_rpc_secret) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = 'P0401'; END IF;
  v_lim := GREATEST(1, LEAST(COALESCE(p_limit, 100), 500));
  v_at := array_remove(p_actor_types, ''); v_ac := array_remove(p_actions, '');
  IF v_at IS NOT NULL AND array_length(v_at, 1) IS NULL THEN v_at := NULL; END IF;
  IF v_ac IS NOT NULL AND array_length(v_ac, 1) IS NULL THEN v_ac := NULL; END IF;
  v_s := NULLIF(btrim(p_search), '');
  RETURN QUERY SELECT a.id, a.created_at, a.actor_type, a.actor_id, a.action,
    a.entity_type, a.entity_id, a.message, a.metadata
  FROM audit_logs a
  WHERE (p_start_at IS NULL OR a.created_at >= p_start_at)
    AND (p_end_at IS NULL OR a.created_at <= p_end_at)
    AND (v_at IS NULL OR a.actor_type = ANY(v_at))
    AND (v_ac IS NULL OR a.action = ANY(v_ac))
    AND (v_s IS NULL OR a.message ILIKE '%'||v_s||'%' OR a.entity_type ILIKE '%'||v_s||'%'
      OR a.action ILIKE '%'||v_s||'%' OR a.metadata::text ILIKE '%'||v_s||'%'
      OR (p_search_day IS NOT NULL AND p_search_month IS NOT NULL
          AND EXTRACT(DAY FROM a.created_at) = p_search_day AND EXTRACT(MONTH FROM a.created_at) = p_search_month
          AND (p_search_year IS NULL OR EXTRACT(YEAR FROM a.created_at) = p_search_year))
      OR (p_search_day IS NULL AND p_search_month IS NOT NULL
          AND EXTRACT(MONTH FROM a.created_at) = p_search_month
          AND (p_search_year IS NULL OR EXTRACT(YEAR FROM a.created_at) = p_search_year)))
    AND (p_before_at IS NULL OR a.created_at < p_before_at
      OR (a.created_at = p_before_at AND (p_before_id IS NULL OR a.id < p_before_id)))
  ORDER BY a.created_at DESC, a.id DESC LIMIT v_lim;
END; $$;

-- ═══════════ TOKENS v2 (JWT) ════════════════════════════════

CREATE OR REPLACE FUNCTION public.rpc_admin_entry_token_generate(p_semester_id uuid)
RETURNS TABLE (raw_token text) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_raw text; v_hash text; v_sn text;
BEGIN
  PERFORM public._assert_semester_access(p_semester_id);
  v_raw := encode(gen_random_bytes(24), 'base64');
  v_hash := encode(extensions.digest(v_raw, 'sha256'), 'hex');
  UPDATE semesters SET entry_token_hash = v_hash, entry_token_enabled = true,
    entry_token_created_at = now(), entry_token_expires_at = null, updated_at = now()
  WHERE id = p_semester_id RETURNING semester_name INTO v_sn;
  IF NOT FOUND THEN RAISE EXCEPTION 'semester_not_found'; END IF;
  PERFORM public._audit_log('admin', auth.uid(), 'entry_token_generate', 'semester', p_semester_id,
    format('Jury entry token generated (%s)', coalesce(v_sn, p_semester_id::text)),
    jsonb_build_object('semester_id', p_semester_id, 'semester_name', v_sn));
  RETURN QUERY SELECT v_raw;
END; $$;

CREATE OR REPLACE FUNCTION public.rpc_admin_entry_token_revoke(p_semester_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_sn text;
BEGIN
  PERFORM public._assert_semester_access(p_semester_id);
  UPDATE semesters SET entry_token_enabled = false, updated_at = now()
  WHERE id = p_semester_id RETURNING semester_name INTO v_sn;
  IF NOT FOUND THEN RAISE EXCEPTION 'semester_not_found'; END IF;
  PERFORM public._audit_log('admin', auth.uid(), 'entry_token_revoke', 'semester', p_semester_id,
    format('Jury entry token revoked (%s)', coalesce(v_sn, p_semester_id::text)),
    jsonb_build_object('semester_id', p_semester_id));
  RETURN true;
END; $$;

CREATE OR REPLACE FUNCTION public.rpc_admin_entry_token_status(p_semester_id uuid)
RETURNS TABLE (enabled boolean, created_at timestamptz, expires_at timestamptz, has_token boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_sem semesters%ROWTYPE;
BEGIN
  PERFORM public._assert_semester_access(p_semester_id);
  SELECT * INTO v_sem FROM semesters WHERE id = p_semester_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'semester_not_found'; END IF;
  RETURN QUERY SELECT v_sem.entry_token_enabled, v_sem.entry_token_created_at,
    v_sem.entry_token_expires_at, (v_sem.entry_token_hash IS NOT NULL);
END; $$;

-- ═══════════ TOKENS v1 (password) ═══════════════════════════

DROP FUNCTION IF EXISTS public.rpc_admin_generate_entry_token(uuid, text, text);
CREATE OR REPLACE FUNCTION public.rpc_admin_generate_entry_token(
  p_semester_id uuid, p_admin_password text, p_rpc_secret text DEFAULT ''
) RETURNS TABLE (raw_token text) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_raw text; v_hash text; v_sn text;
BEGIN
  IF NOT public._verify_admin_password(p_admin_password, p_rpc_secret) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = 'P0401'; END IF;
  v_raw := encode(gen_random_bytes(24), 'base64');
  v_hash := encode(extensions.digest(v_raw, 'sha256'), 'hex');
  UPDATE semesters SET entry_token_hash = v_hash, entry_token_enabled = true,
    entry_token_created_at = now(), entry_token_expires_at = null, updated_at = now()
  WHERE id = p_semester_id RETURNING semester_name INTO v_sn;
  IF NOT FOUND THEN RAISE EXCEPTION 'semester_not_found'; END IF;
  PERFORM public._audit_log('admin', null::uuid, 'entry_token_generate', 'semester', p_semester_id,
    format('Jury entry token generated (%s)', coalesce(v_sn, p_semester_id::text)),
    jsonb_build_object('semester_id', p_semester_id, 'semester_name', v_sn));
  RETURN QUERY SELECT v_raw;
END; $$;

DROP FUNCTION IF EXISTS public.rpc_admin_revoke_entry_token(uuid, text, text);
CREATE OR REPLACE FUNCTION public.rpc_admin_revoke_entry_token(
  p_semester_id uuid, p_admin_password text, p_rpc_secret text DEFAULT ''
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_sn text;
BEGIN
  IF NOT public._verify_admin_password(p_admin_password, p_rpc_secret) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = 'P0401'; END IF;
  UPDATE semesters SET entry_token_enabled = false, updated_at = now()
  WHERE id = p_semester_id RETURNING semester_name INTO v_sn;
  IF NOT FOUND THEN RAISE EXCEPTION 'semester_not_found'; END IF;
  PERFORM public._audit_log('admin', null::uuid, 'entry_token_revoke', 'semester', p_semester_id,
    format('Jury entry token revoked (%s)', coalesce(v_sn, p_semester_id::text)),
    jsonb_build_object('semester_id', p_semester_id));
  RETURN true;
END; $$;

DROP FUNCTION IF EXISTS public.rpc_admin_get_entry_token_status(uuid, text, text);
CREATE OR REPLACE FUNCTION public.rpc_admin_get_entry_token_status(
  p_semester_id uuid, p_admin_password text, p_rpc_secret text DEFAULT ''
) RETURNS TABLE (enabled boolean, created_at timestamptz, expires_at timestamptz, has_token boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_sem semesters%ROWTYPE;
BEGIN
  IF NOT public._verify_admin_password(p_admin_password, p_rpc_secret) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = 'P0401'; END IF;
  SELECT * INTO v_sem FROM semesters WHERE id = p_semester_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'semester_not_found'; END IF;
  RETURN QUERY SELECT v_sem.entry_token_enabled, v_sem.entry_token_created_at,
    v_sem.entry_token_expires_at, (v_sem.entry_token_hash IS NOT NULL);
END; $$;

-- ═══════════ EXPORT v2 (JWT, tenant-scoped) ═════════════════

CREATE OR REPLACE FUNCTION public.rpc_admin_export_full(p_tenant_id uuid, p_backup_password text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_payload jsonb;
BEGIN
  PERFORM public._assert_tenant_admin(p_tenant_id);
  PERFORM public._assert_backup_password(p_backup_password);
  v_payload := jsonb_build_object(
    'exported_at', now(), 'schema_version', 2, 'tenant_id', p_tenant_id,
    'tenant', (SELECT row_to_json(t) FROM (
      SELECT id, code, short_label, university, department, status FROM tenants WHERE id = p_tenant_id) t),
    'semesters', COALESCE((SELECT jsonb_agg(row_to_json(s)) FROM (
      SELECT id, tenant_id, semester_name, is_current, is_locked, poster_date,
        criteria_template, mudek_template, created_at, updated_at
      FROM semesters WHERE tenant_id = p_tenant_id) s), '[]'::jsonb),
    'jurors', COALESCE((SELECT jsonb_agg(DISTINCT jsonb_build_object(
      'id',j.id,'juror_name',j.juror_name,'juror_inst',j.juror_inst,
      'created_at',j.created_at,'updated_at',j.updated_at))
      FROM jurors j WHERE EXISTS (
        SELECT 1 FROM juror_semester_auth jsa WHERE jsa.juror_id = j.id AND jsa.tenant_id = p_tenant_id
      )), '[]'::jsonb),
    'projects', COALESCE((SELECT jsonb_agg(row_to_json(p)) FROM projects p WHERE p.tenant_id = p_tenant_id), '[]'::jsonb),
    'scores', COALESCE((SELECT jsonb_agg(row_to_json(sc)) FROM scores sc WHERE sc.tenant_id = p_tenant_id), '[]'::jsonb),
    'juror_semester_auth', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'id',a.id,'juror_id',a.juror_id,'semester_id',a.semester_id,'tenant_id',a.tenant_id,
      'created_at',a.created_at,'last_seen_at',a.last_seen_at,'failed_attempts',a.failed_attempts,
      'locked_until',a.locked_until,'edit_enabled',a.edit_enabled,'pin_reveal_pending',a.pin_reveal_pending))
      FROM juror_semester_auth a WHERE a.tenant_id = p_tenant_id), '[]'::jsonb));
  PERFORM public._audit_log('admin', auth.uid(), 'db_export', 'settings', null::uuid,
    'Admin exported database backup.', jsonb_build_object('tenant_id', p_tenant_id));
  RETURN v_payload;
END; $$;

-- ═══════════ EXPORT v1 (password) ═══════════════════════════

CREATE OR REPLACE FUNCTION public.rpc_admin_full_export(
  p_backup_password text, p_admin_password text, p_rpc_secret text DEFAULT ''
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_payload jsonb;
BEGIN
  IF NOT public._verify_admin_password(p_admin_password, p_rpc_secret) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = 'P0401'; END IF;
  PERFORM public._assert_backup_password(p_backup_password);
  v_payload := jsonb_build_object(
    'exported_at', now(), 'schema_version', 2,
    'semesters', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'id',s.id,'tenant_id',s.tenant_id,'semester_name',s.semester_name,'is_current',s.is_current,
      'is_locked',s.is_locked,'poster_date',s.poster_date,'criteria_template',s.criteria_template,
      'mudek_template',s.mudek_template,'created_at',s.created_at,'updated_at',s.updated_at))
      FROM semesters s), '[]'::jsonb),
    'jurors', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'id',j.id,'juror_name',j.juror_name,'juror_inst',j.juror_inst,
      'created_at',j.created_at,'updated_at',j.updated_at)) FROM jurors j), '[]'::jsonb),
    'projects', COALESCE((SELECT jsonb_agg(row_to_json(p)) FROM projects p), '[]'::jsonb),
    'scores', COALESCE((SELECT jsonb_agg(row_to_json(sc)) FROM scores sc), '[]'::jsonb),
    'juror_semester_auth', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'id',a.id,'juror_id',a.juror_id,'semester_id',a.semester_id,'tenant_id',a.tenant_id,
      'created_at',a.created_at,'last_seen_at',a.last_seen_at,'failed_attempts',a.failed_attempts,
      'locked_until',a.locked_until,'edit_enabled',a.edit_enabled,'pin_reveal_pending',a.pin_reveal_pending))
      FROM juror_semester_auth a), '[]'::jsonb));
  PERFORM public._audit_log('admin', null::uuid, 'db_export', 'settings', null::uuid,
    'Admin exported database backup.', null);
  RETURN v_payload;
END; $$;

-- ═══════════ IMPORT v1 (password) ═══════════════════════════

CREATE OR REPLACE FUNCTION public.rpc_admin_full_import(
  p_backup_password text, p_admin_password text, p_data jsonb, p_rpc_secret text DEFAULT ''
) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE r jsonb; v_tid uuid;
BEGIN
  IF NOT public._verify_admin_password(p_admin_password, p_rpc_secret) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = 'P0401'; END IF;
  PERFORM public._assert_backup_password(p_backup_password);
  SELECT id INTO v_tid FROM tenants WHERE status = 'active' ORDER BY created_at LIMIT 1;
  IF v_tid IS NULL THEN INSERT INTO tenants (code, short_label) VALUES ('default','Default') RETURNING id INTO v_tid; END IF;
  -- 1. Semesters
  FOR r IN SELECT * FROM jsonb_array_elements(COALESCE(p_data->'semesters','[]'::jsonb)) LOOP
    INSERT INTO semesters (id, tenant_id, semester_name, is_current, is_locked, poster_date, created_at, updated_at)
    VALUES ((r->>'id')::uuid, COALESCE((r->>'tenant_id')::uuid, v_tid),
      COALESCE(r->>'semester_name', r->>'name'),
      COALESCE((r->>'is_current')::boolean, (r->>'is_active')::boolean, false),
      COALESCE((r->>'is_locked')::boolean, false), (r->>'poster_date')::date,
      COALESCE((r->>'created_at')::timestamptz, now()), COALESCE((r->>'updated_at')::timestamptz, now()))
    ON CONFLICT (id) DO UPDATE SET semester_name = EXCLUDED.semester_name, is_current = EXCLUDED.is_current,
      is_locked = EXCLUDED.is_locked, poster_date = EXCLUDED.poster_date, updated_at = EXCLUDED.updated_at;
  END LOOP;
  -- 2. Jurors
  FOR r IN SELECT * FROM jsonb_array_elements(COALESCE(p_data->'jurors','[]'::jsonb)) LOOP
    INSERT INTO jurors (id, juror_name, juror_inst, created_at, updated_at) VALUES (
      (r->>'id')::uuid, r->>'juror_name', r->>'juror_inst',
      COALESCE((r->>'created_at')::timestamptz, now()), COALESCE((r->>'updated_at')::timestamptz, now()))
    ON CONFLICT (id) DO UPDATE SET juror_name = EXCLUDED.juror_name, juror_inst = EXCLUDED.juror_inst, updated_at = EXCLUDED.updated_at;
  END LOOP;
  -- 3. Juror semester auth
  FOR r IN SELECT * FROM jsonb_array_elements(COALESCE(p_data->'juror_semester_auth','[]'::jsonb)) LOOP
    INSERT INTO juror_semester_auth (id, juror_id, semester_id, tenant_id, pin_hash, pin_reveal_pending,
      pin_plain_once, created_at, failed_attempts, locked_until, last_seen_at, edit_enabled)
    VALUES ((r->>'id')::uuid, (r->>'juror_id')::uuid, (r->>'semester_id')::uuid,
      COALESCE((r->>'tenant_id')::uuid, v_tid), COALESCE(r->>'pin_hash', crypt('0000', gen_salt('bf'))),
      COALESCE((r->>'pin_reveal_pending')::boolean, false), r->>'pin_plain_once',
      COALESCE((r->>'created_at')::timestamptz, now()), COALESCE((r->>'failed_attempts')::integer, 0),
      (r->>'locked_until')::timestamptz, (r->>'last_seen_at')::timestamptz,
      COALESCE((r->>'edit_enabled')::boolean, false))
    ON CONFLICT (juror_id, semester_id) DO UPDATE SET pin_hash = EXCLUDED.pin_hash,
      pin_reveal_pending = EXCLUDED.pin_reveal_pending, pin_plain_once = EXCLUDED.pin_plain_once,
      failed_attempts = EXCLUDED.failed_attempts, locked_until = EXCLUDED.locked_until,
      last_seen_at = EXCLUDED.last_seen_at, edit_enabled = EXCLUDED.edit_enabled;
  END LOOP;
  -- 4. Projects
  FOR r IN SELECT * FROM jsonb_array_elements(COALESCE(p_data->'projects','[]'::jsonb)) LOOP
    INSERT INTO projects (id, semester_id, tenant_id, group_no, project_title, group_students, created_at, updated_at)
    VALUES ((r->>'id')::uuid, (r->>'semester_id')::uuid, COALESCE((r->>'tenant_id')::uuid, v_tid),
      (r->>'group_no')::integer, r->>'project_title', COALESCE(r->>'group_students',''),
      COALESCE((r->>'created_at')::timestamptz, now()), COALESCE((r->>'updated_at')::timestamptz, now()))
    ON CONFLICT (id) DO UPDATE SET semester_id = EXCLUDED.semester_id, group_no = EXCLUDED.group_no,
      project_title = EXCLUDED.project_title, group_students = EXCLUDED.group_students, updated_at = EXCLUDED.updated_at;
  END LOOP;
  -- 5. Scores
  FOR r IN SELECT * FROM jsonb_array_elements(COALESCE(p_data->'scores','[]'::jsonb)) LOOP
    INSERT INTO scores (id, semester_id, project_id, juror_id, tenant_id, poster_date,
      criteria_scores, total, comment, final_submitted_at, created_at, updated_at)
    VALUES ((r->>'id')::uuid, (r->>'semester_id')::uuid, (r->>'project_id')::uuid, (r->>'juror_id')::uuid,
      COALESCE((r->>'tenant_id')::uuid, v_tid), (r->>'poster_date')::date,
      COALESCE(r->'criteria_scores', CASE
        WHEN (r->>'technical') IS NOT NULL OR (r->>'written') IS NOT NULL
             OR (r->>'oral') IS NOT NULL OR (r->>'teamwork') IS NOT NULL
        THEN jsonb_strip_nulls(jsonb_build_object('technical',(r->>'technical')::integer,
          'design',(r->>'written')::integer,'delivery',(r->>'oral')::integer,'teamwork',(r->>'teamwork')::integer))
        ELSE NULL END),
      (r->>'total')::integer, r->>'comment', (r->>'final_submitted_at')::timestamptz,
      COALESCE((r->>'created_at')::timestamptz, now()), COALESCE((r->>'updated_at')::timestamptz, now()))
    ON CONFLICT (id) DO UPDATE SET poster_date = EXCLUDED.poster_date, criteria_scores = EXCLUDED.criteria_scores,
      total = EXCLUDED.total, comment = EXCLUDED.comment, final_submitted_at = EXCLUDED.final_submitted_at,
      updated_at = EXCLUDED.updated_at;
  END LOOP;
  PERFORM public._audit_log('admin', null::uuid, 'db_import', 'settings', null::uuid,
    'Admin restored database from backup.', null);
  RETURN 'ok';
END; $$;
