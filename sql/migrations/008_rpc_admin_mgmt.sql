-- ============================================================
-- 008_rpc_admin_mgmt.sql
-- Admin management RPCs: login, security_state, passwords,
-- export/import, audit logs, settings, eval lock.
-- Extracted from 000_bootstrap.sql (move-only refactor).
-- ============================================================

CREATE OR REPLACE FUNCTION public._verify_admin_password(
  p_password    text,
  p_rpc_secret  text DEFAULT ''
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
  WHERE key = 'admin_password_hash';

  IF v_hash IS NULL OR v_hash = '' THEN
    RETURN false;
  END IF;

  RETURN crypt(p_password, v_hash) = v_hash;
END;
$$;

-- Rate-limited admin login (SEC-4).
-- Return type: TABLE(ok, locked_until, failed_attempts).
-- Policy: 5 consecutive failures → 15-minute lockout.
-- State stored in settings table (admin_failed_attempts, admin_locked_until).
-- DROP first so re-running bootstrap against an existing DB doesn't fail on
-- the return-type change.
DROP FUNCTION IF EXISTS public.rpc_admin_login(text, text);

CREATE OR REPLACE FUNCTION public.rpc_admin_login(
  p_password   text,
  p_rpc_secret text DEFAULT ''
)
RETURNS TABLE(ok boolean, locked_until timestamptz, failed_attempts integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_attempts_str text;
  v_locked_str   text;
  v_attempts     integer;
  v_locked       timestamptz;
  v_new_locked   timestamptz;
  v_now          timestamptz := now();
  v_ok           boolean;
BEGIN
  -- Read current rate-limit state
  SELECT value INTO v_attempts_str FROM settings WHERE key = 'admin_failed_attempts';
  SELECT value INTO v_locked_str   FROM settings WHERE key = 'admin_locked_until';

  v_attempts := COALESCE(v_attempts_str::integer, 0);
  v_locked   := CASE
                  WHEN v_locked_str IS NOT NULL AND v_locked_str <> ''
                  THEN v_locked_str::timestamptz
                  ELSE NULL
                END;

  -- Reject immediately if still locked
  IF v_locked IS NOT NULL AND v_locked > v_now THEN
    RETURN QUERY SELECT false, v_locked, v_attempts;
    RETURN;
  END IF;

  -- Lock window expired: reset counter
  IF v_locked IS NOT NULL AND v_locked <= v_now THEN
    INSERT INTO settings (key, value, updated_at)
      VALUES ('admin_failed_attempts', '0', now())
      ON CONFLICT (key) DO UPDATE SET value = '0', updated_at = now();
    INSERT INTO settings (key, value, updated_at)
      VALUES ('admin_locked_until', '', now())
      ON CONFLICT (key) DO UPDATE SET value = '', updated_at = now();
    v_attempts := 0;
    v_locked   := NULL;
  END IF;

  -- Verify password
  v_ok := public._verify_admin_password(p_password, p_rpc_secret);

  IF v_ok THEN
    -- Success: clear rate-limit state
    INSERT INTO settings (key, value, updated_at)
      VALUES ('admin_failed_attempts', '0', now())
      ON CONFLICT (key) DO UPDATE SET value = '0', updated_at = now();
    INSERT INTO settings (key, value, updated_at)
      VALUES ('admin_locked_until', '', now())
      ON CONFLICT (key) DO UPDATE SET value = '', updated_at = now();
    RETURN QUERY SELECT true, null::timestamptz, 0;
    RETURN;
  END IF;

  -- Failed: increment counter, maybe lock
  v_attempts   := v_attempts + 1;
  v_new_locked := NULL;

  IF v_attempts >= 5 THEN
    v_new_locked := v_now + interval '15 minutes';
  END IF;

  INSERT INTO settings (key, value, updated_at)
    VALUES ('admin_failed_attempts', v_attempts::text, now())
    ON CONFLICT (key) DO UPDATE SET value = v_attempts::text, updated_at = now();

  IF v_new_locked IS NOT NULL THEN
    INSERT INTO settings (key, value, updated_at)
      VALUES ('admin_locked_until', v_new_locked::text, now())
      ON CONFLICT (key) DO UPDATE SET value = v_new_locked::text, updated_at = now();
  END IF;

  PERFORM public._audit_log(
    'system',
    null::uuid,
    'admin_login_failed',
    'settings',
    null::uuid,
    'Admin login failed. Attempt ' || v_attempts || '.' ||
      CASE WHEN v_new_locked IS NOT NULL
           THEN ' Account locked until ' || v_new_locked::text || '.'
           ELSE ''
      END,
    null
  );

  RETURN QUERY SELECT false, v_new_locked, v_attempts;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_admin_security_state()
RETURNS TABLE (
  admin_password_set boolean,
  delete_password_set boolean,
  backup_password_set boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT
    EXISTS (
      SELECT 1 FROM settings
      WHERE key = 'admin_password_hash'
        AND value IS NOT NULL
        AND value <> ''
    ),
    EXISTS (
      SELECT 1 FROM settings
      WHERE key = 'delete_password_hash'
        AND value IS NOT NULL
        AND value <> ''
    ),
    EXISTS (
      SELECT 1 FROM settings
      WHERE key = 'backup_password_hash'
        AND value IS NOT NULL
        AND value <> ''
    );
END;
$$;

CREATE OR REPLACE FUNCTION public._verify_delete_password(p_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_hash text;
BEGIN
  SELECT value INTO v_hash
  FROM settings
  WHERE key = 'delete_password_hash';

  IF v_hash IS NULL OR v_hash = '' THEN
    RETURN false;
  END IF;

  RETURN crypt(p_password, v_hash) = v_hash;
END;
$$;

CREATE OR REPLACE FUNCTION public._assert_delete_password(p_password text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_hash text;
BEGIN
  SELECT value INTO v_hash
  FROM settings
  WHERE key = 'delete_password_hash';

  IF v_hash IS NULL OR v_hash = '' THEN
    RAISE EXCEPTION 'delete_password_missing' USING ERRCODE = 'P0401';
  END IF;

  IF crypt(p_password, v_hash) <> v_hash THEN
    RAISE EXCEPTION 'incorrect_delete_password' USING ERRCODE = 'P0401';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_admin_change_delete_password(
  p_current_password text,
  p_new_password text,
  p_admin_password text,
  p_rpc_secret     text DEFAULT ''
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NOT public._verify_admin_password(p_admin_password, p_rpc_secret) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = 'P0401';
  END IF;

  PERFORM public._assert_delete_password(p_current_password);

  INSERT INTO settings (key, value)
  VALUES ('delete_password_hash', crypt(p_new_password, gen_salt('bf')))
  ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value,
        updated_at = now();

  PERFORM public._audit_log(
    'admin',
    null::uuid,
    'delete_password_change',
    'settings',
    null::uuid,
    'Admin changed delete password.',
    null
  );

  RETURN true;
END;
$$;

-- ── Backup Password ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public._assert_backup_password(p_password text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_hash text;
BEGIN
  SELECT value INTO v_hash
  FROM settings
  WHERE key = 'backup_password_hash';

  IF v_hash IS NULL OR v_hash = '' THEN
    RAISE EXCEPTION 'backup_password_missing' USING ERRCODE = 'P0401';
  END IF;

  IF crypt(p_password, v_hash) <> v_hash THEN
    RAISE EXCEPTION 'incorrect_backup_password' USING ERRCODE = 'P0401';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_admin_change_backup_password(
  p_current_password text,
  p_new_password     text,
  p_admin_password   text,
  p_rpc_secret       text DEFAULT ''
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NOT public._verify_admin_password(p_admin_password, p_rpc_secret) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = 'P0401';
  END IF;

  PERFORM public._assert_backup_password(p_current_password);

  INSERT INTO settings (key, value)
  VALUES ('backup_password_hash', crypt(p_new_password, gen_salt('bf')))
  ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value,
        updated_at = now();

  PERFORM public._audit_log(
    'admin',
    null::uuid,
    'backup_password_change',
    'settings',
    null::uuid,
    'Admin changed backup password.',
    null
  );

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_admin_full_export(
  p_backup_password text,
  p_admin_password  text,
  p_rpc_secret      text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_payload jsonb;
BEGIN
  IF NOT public._verify_admin_password(p_admin_password, p_rpc_secret) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = 'P0401';
  END IF;

  PERFORM public._assert_backup_password(p_backup_password);

  v_payload := jsonb_build_object(
    'exported_at',     now(),
    'schema_version',  1,
    'semesters',       COALESCE((SELECT jsonb_agg(row_to_json(s)) FROM semesters s),           '[]'::jsonb),
    'jurors',          COALESCE((SELECT jsonb_agg(row_to_json(j)) FROM jurors j),              '[]'::jsonb),
    'projects',        COALESCE((SELECT jsonb_agg(row_to_json(p)) FROM projects p),            '[]'::jsonb),
    'scores',          COALESCE((SELECT jsonb_agg(row_to_json(sc)) FROM scores sc),            '[]'::jsonb),
    'juror_semester_auth', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id',                  a.id,
        'juror_id',            a.juror_id,
        'semester_id',         a.semester_id,
        'created_at',          a.created_at,
        'last_seen_at',        a.last_seen_at,
        'failed_attempts',     a.failed_attempts,
        'locked_until',        a.locked_until,
        'edit_enabled',        a.edit_enabled,
        'pin_reveal_pending',  a.pin_reveal_pending
        -- pin_hash and pin_plain_once intentionally excluded
      ))
      FROM juror_semester_auth a
    ), '[]'::jsonb)
  );

  PERFORM public._audit_log(
    'admin',
    null::uuid,
    'db_export',
    'settings',
    null::uuid,
    'Admin exported database backup.',
    null
  );

  RETURN v_payload;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_admin_full_import(
  p_backup_password text,
  p_admin_password  text,
  p_data            jsonb,
  p_rpc_secret      text DEFAULT ''
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  r jsonb;
BEGIN
  IF NOT public._verify_admin_password(p_admin_password, p_rpc_secret) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = 'P0401';
  END IF;

  PERFORM public._assert_backup_password(p_backup_password);

  -- 1. Semesters (no FK deps)
  FOR r IN SELECT * FROM jsonb_array_elements(COALESCE(p_data->'semesters', '[]'::jsonb)) LOOP
    INSERT INTO semesters (id, name, is_active, is_locked, poster_date, created_at, updated_at)
    VALUES (
      (r->>'id')::uuid,
      r->>'name',
      COALESCE((r->>'is_active')::boolean, false),
      COALESCE((r->>'is_locked')::boolean, false),
      (r->>'poster_date')::date,
      COALESCE((r->>'created_at')::timestamptz, now()),
      COALESCE((r->>'updated_at')::timestamptz, now())
    )
    ON CONFLICT (id) DO UPDATE SET
      name        = EXCLUDED.name,
      is_active   = EXCLUDED.is_active,
      is_locked   = EXCLUDED.is_locked,
      poster_date = EXCLUDED.poster_date,
      updated_at  = EXCLUDED.updated_at;
  END LOOP;

  -- 2. Jurors (no FK deps)
  FOR r IN SELECT * FROM jsonb_array_elements(COALESCE(p_data->'jurors', '[]'::jsonb)) LOOP
    INSERT INTO jurors (id, juror_name, juror_inst, created_at, updated_at)
    VALUES (
      (r->>'id')::uuid,
      r->>'juror_name',
      r->>'juror_inst',
      COALESCE((r->>'created_at')::timestamptz, now()),
      COALESCE((r->>'updated_at')::timestamptz, now())
    )
    ON CONFLICT (id) DO UPDATE SET
      juror_name = EXCLUDED.juror_name,
      juror_inst = EXCLUDED.juror_inst,
      updated_at = EXCLUDED.updated_at;
  END LOOP;

  -- 3. Juror semester auth (deps: jurors, semesters)
  FOR r IN SELECT * FROM jsonb_array_elements(COALESCE(p_data->'juror_semester_auth', '[]'::jsonb)) LOOP
    INSERT INTO juror_semester_auth (
      id, juror_id, semester_id, pin_hash, pin_reveal_pending, pin_plain_once,
      created_at, failed_attempts, locked_until, last_seen_at, edit_enabled
    )
    VALUES (
      (r->>'id')::uuid,
      (r->>'juror_id')::uuid,
      (r->>'semester_id')::uuid,
      r->>'pin_hash',
      COALESCE((r->>'pin_reveal_pending')::boolean, false),
      r->>'pin_plain_once',
      COALESCE((r->>'created_at')::timestamptz, now()),
      COALESCE((r->>'failed_attempts')::integer, 0),
      (r->>'locked_until')::timestamptz,
      (r->>'last_seen_at')::timestamptz,
      COALESCE((r->>'edit_enabled')::boolean, false)
    )
    ON CONFLICT (juror_id, semester_id) DO UPDATE SET
      pin_hash           = EXCLUDED.pin_hash,
      pin_reveal_pending = EXCLUDED.pin_reveal_pending,
      pin_plain_once     = EXCLUDED.pin_plain_once,
      failed_attempts    = EXCLUDED.failed_attempts,
      locked_until       = EXCLUDED.locked_until,
      last_seen_at       = EXCLUDED.last_seen_at,
      edit_enabled       = EXCLUDED.edit_enabled;
  END LOOP;

  -- 4. Projects (deps: semesters)
  FOR r IN SELECT * FROM jsonb_array_elements(COALESCE(p_data->'projects', '[]'::jsonb)) LOOP
    INSERT INTO projects (id, semester_id, group_no, project_title, group_students, created_at, updated_at)
    VALUES (
      (r->>'id')::uuid,
      (r->>'semester_id')::uuid,
      (r->>'group_no')::integer,
      r->>'project_title',
      COALESCE(r->>'group_students', ''),
      COALESCE((r->>'created_at')::timestamptz, now()),
      COALESCE((r->>'updated_at')::timestamptz, now())
    )
    ON CONFLICT (id) DO UPDATE SET
      semester_id    = EXCLUDED.semester_id,
      group_no       = EXCLUDED.group_no,
      project_title  = EXCLUDED.project_title,
      group_students = EXCLUDED.group_students,
      updated_at     = EXCLUDED.updated_at;
  END LOOP;

  -- 5. Scores (deps: jurors, projects, semesters)
  FOR r IN SELECT * FROM jsonb_array_elements(COALESCE(p_data->'scores', '[]'::jsonb)) LOOP
    INSERT INTO scores (
      id, semester_id, project_id, juror_id,
      poster_date, criteria_scores, total, comment,
      final_submitted_at, created_at, updated_at
    )
    VALUES (
      (r->>'id')::uuid,
      (r->>'semester_id')::uuid,
      (r->>'project_id')::uuid,
      (r->>'juror_id')::uuid,
      (r->>'poster_date')::date,
      -- Accept criteria_scores from new exports; fall back to legacy fixed columns
      COALESCE(
        (r->'criteria_scores'),
        CASE
          WHEN (r->>'technical') IS NOT NULL
               OR (r->>'written') IS NOT NULL
               OR (r->>'oral') IS NOT NULL
               OR (r->>'teamwork') IS NOT NULL
          THEN jsonb_strip_nulls(jsonb_build_object(
            'technical', (r->>'technical')::integer,
            'design',    (r->>'written')::integer,
            'delivery',  (r->>'oral')::integer,
            'teamwork',  (r->>'teamwork')::integer
          ))
          ELSE NULL
        END
      ),
      (r->>'total')::integer,
      r->>'comment',
      (r->>'final_submitted_at')::timestamptz,
      COALESCE((r->>'created_at')::timestamptz, now()),
      COALESCE((r->>'updated_at')::timestamptz, now())
    )
    ON CONFLICT (id) DO UPDATE SET
      poster_date        = EXCLUDED.poster_date,
      criteria_scores    = EXCLUDED.criteria_scores,
      total              = EXCLUDED.total,
      comment            = EXCLUDED.comment,
      final_submitted_at = EXCLUDED.final_submitted_at,
      updated_at         = EXCLUDED.updated_at;
  END LOOP;

  PERFORM public._audit_log(
    'admin',
    null::uuid,
    'db_import',
    'settings',
    null::uuid,
    'Admin restored database from backup.',
    null
  );

  RETURN 'ok';
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_admin_bootstrap_backup_password(
  p_new_password   text,
  p_admin_password text,
  p_rpc_secret     text DEFAULT ''
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_hash text;
BEGIN
  IF NOT public._verify_admin_password(p_admin_password, p_rpc_secret) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = 'P0401';
  END IF;

  SELECT value INTO v_hash FROM settings WHERE key = 'backup_password_hash';
  IF v_hash IS NOT NULL AND v_hash <> '' THEN
    RAISE EXCEPTION 'already_initialized';
  END IF;

  INSERT INTO settings (key, value)
  VALUES ('backup_password_hash', crypt(p_new_password, gen_salt('bf')))
  ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value,
        updated_at = now();

  PERFORM public._audit_log(
    'admin', null::uuid, 'backup_password_change', 'settings', null::uuid,
    'Admin initialized backup password.', null
  );

  RETURN true;
END;
$$;

DROP FUNCTION IF EXISTS public.rpc_admin_list_audit_logs(text, timestamptz, timestamptz, text[], text[], integer);
DROP FUNCTION IF EXISTS public.rpc_admin_list_audit_logs(text, timestamptz, timestamptz, text[], text[], text, integer);
DROP FUNCTION IF EXISTS public.rpc_admin_list_audit_logs(text, timestamptz, timestamptz, text[], text[], text, integer, timestamptz, uuid);
DROP FUNCTION IF EXISTS public.rpc_admin_list_audit_logs(text, timestamptz, timestamptz, text[], text[], text, integer, integer, integer, integer, timestamptz, uuid);
DROP FUNCTION IF EXISTS public.rpc_admin_list_audit_logs(text, timestamptz, timestamptz, text[], text[], integer, timestamptz, uuid);
CREATE OR REPLACE FUNCTION public.rpc_admin_list_audit_logs(
  p_admin_password text,
  p_start_at       timestamptz DEFAULT NULL,
  p_end_at         timestamptz DEFAULT NULL,
  p_actor_types    text[] DEFAULT NULL,
  p_actions        text[] DEFAULT NULL,
  p_search         text DEFAULT NULL,
  p_search_day     integer DEFAULT NULL,
  p_search_month   integer DEFAULT NULL,
  p_search_year    integer DEFAULT NULL,
  p_limit          integer DEFAULT 100,
  p_before_at      timestamptz DEFAULT NULL,
  p_before_id      uuid DEFAULT NULL,
  p_rpc_secret     text DEFAULT ''
)
RETURNS TABLE (
  id          uuid,
  created_at  timestamptz,
  actor_type  text,
  actor_id    uuid,
  action      text,
  entity_type text,
  entity_id   uuid,
  message     text,
  metadata    jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_limit integer;
  v_actor_types text[];
  v_actions text[];
  v_search text;
BEGIN
  IF NOT public._verify_admin_password(p_admin_password, p_rpc_secret) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = 'P0401';
  END IF;

  v_limit := GREATEST(1, LEAST(COALESCE(p_limit, 100), 500));
  v_actor_types := array_remove(p_actor_types, '');
  v_actions := array_remove(p_actions, '');
  IF v_actor_types IS NOT NULL AND array_length(v_actor_types, 1) IS NULL THEN
    v_actor_types := NULL;
  END IF;
  IF v_actions IS NOT NULL AND array_length(v_actions, 1) IS NULL THEN
    v_actions := NULL;
  END IF;
  v_search := NULLIF(btrim(p_search), '');

  RETURN QUERY
    SELECT
      a.id,
      a.created_at,
      a.actor_type,
      a.actor_id,
      a.action,
      a.entity_type,
      a.entity_id,
      a.message,
      a.metadata
    FROM audit_logs a
    WHERE (p_start_at IS NULL OR a.created_at >= p_start_at)
      AND (p_end_at IS NULL OR a.created_at <= p_end_at)
      AND (v_actor_types IS NULL OR a.actor_type = ANY(v_actor_types))
      AND (v_actions IS NULL OR a.action = ANY(v_actions))
      AND (
        v_search IS NULL
        OR a.message ILIKE ('%' || v_search || '%')
        OR a.entity_type ILIKE ('%' || v_search || '%')
        OR a.action ILIKE ('%' || v_search || '%')
        OR a.metadata::text ILIKE ('%' || v_search || '%')
        OR (
          p_search_day IS NOT NULL
          AND p_search_month IS NOT NULL
          AND EXTRACT(DAY FROM a.created_at) = p_search_day
          AND EXTRACT(MONTH FROM a.created_at) = p_search_month
          AND (p_search_year IS NULL OR EXTRACT(YEAR FROM a.created_at) = p_search_year)
        )
        OR (
          p_search_day IS NULL
          AND p_search_month IS NOT NULL
          AND EXTRACT(MONTH FROM a.created_at) = p_search_month
          AND (p_search_year IS NULL OR EXTRACT(YEAR FROM a.created_at) = p_search_year)
        )
      )
      AND (
        p_before_at IS NULL
        OR a.created_at < p_before_at
        OR (a.created_at = p_before_at AND (p_before_id IS NULL OR a.id < p_before_id))
      )
    ORDER BY a.created_at DESC, a.id DESC
    LIMIT v_limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_admin_get_settings(
  p_admin_password text,
  p_rpc_secret     text DEFAULT ''
)
RETURNS TABLE (key text, value text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
#variable_conflict use_column
BEGIN
  IF NOT public._verify_admin_password(p_admin_password, p_rpc_secret) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = 'P0401';
  END IF;

  RETURN QUERY
    SELECT s.key, s.value
    FROM settings s
    WHERE s.key NOT IN (
      'pin_secret',
      'rpc_secret',
      'admin_password_hash',
      'delete_password_hash',
      'backup_password_hash'
    )
    ORDER BY s.key ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_admin_set_setting(
  p_key text,
  p_value text,
  p_admin_password text,
  p_rpc_secret     text DEFAULT ''
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
#variable_conflict use_column
BEGIN
  IF NOT public._verify_admin_password(p_admin_password, p_rpc_secret) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = 'P0401';
  END IF;

  INSERT INTO settings (key, value)
  VALUES (p_key, p_value)
  ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value,
        updated_at = now();

  PERFORM public._audit_log(
    'admin',
    null::uuid,
    'setting_change',
    'settings',
    null::uuid,
    format('Admin changed setting %s.', COALESCE(NULLIF(trim(p_key), ''), '?')),
    jsonb_build_object('key', p_key)
  );

  RETURN true;
END;
$$;

DROP FUNCTION IF EXISTS public.rpc_admin_set_semester_eval_lock(uuid, boolean, text);
CREATE OR REPLACE FUNCTION public.rpc_admin_set_semester_eval_lock(
  p_semester_id uuid,
  p_enabled boolean,
  p_admin_password text,
  p_rpc_secret     text DEFAULT ''
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_sem_name text;
  v_enabled boolean := COALESCE(p_enabled, false);
BEGIN
  IF NOT public._verify_admin_password(p_admin_password, p_rpc_secret) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = 'P0401';
  END IF;

  UPDATE semesters s
  SET is_locked = v_enabled,
      updated_at = now()
  WHERE s.id = p_semester_id
  RETURNING s.name INTO v_sem_name;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'semester_not_found';
  END IF;

  PERFORM public._audit_log(
    'admin',
    null::uuid,
    'eval_lock_toggle',
    'semester',
    p_semester_id,
    format(
      'Admin turned evaluation lock %s (%s).',
      CASE WHEN v_enabled THEN 'ON' ELSE 'OFF' END,
      COALESCE(v_sem_name, p_semester_id::text)
    ),
    jsonb_build_object(
      'semester_id', p_semester_id,
      'semester_name', v_sem_name,
      'enabled', v_enabled
    )
  );

  RETURN true;
END;
$$;

-- ── Admin password security ─────────────────────────────────

DROP FUNCTION IF EXISTS public.rpc_admin_change_password(text, text);
DROP FUNCTION IF EXISTS public.rpc_admin_change_password(text, text, text);
CREATE OR REPLACE FUNCTION public.rpc_admin_change_password(
  p_current_password text,
  p_new_password text,
  p_rpc_secret text DEFAULT ''
)
RETURNS TABLE (ok boolean)
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
  WHERE key = 'admin_password_hash';

  IF v_hash IS NULL OR v_hash = '' THEN
    RAISE EXCEPTION 'admin_password_hash_missing';
  END IF;

  IF crypt(p_current_password, v_hash) <> v_hash THEN
    RAISE EXCEPTION 'incorrect_password';
  END IF;

  INSERT INTO settings (key, value)
  VALUES ('admin_password_hash', crypt(p_new_password, gen_salt('bf')))
  ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value,
        updated_at = now();

  PERFORM public._audit_log(
    'admin',
    null::uuid,
    'admin_password_change',
    'settings',
    null::uuid,
    'Admin changed admin password.',
    null
  );

  RETURN QUERY SELECT true;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_admin_bootstrap_delete_password(
  p_new_password text,
  p_admin_password text,
  p_rpc_secret     text DEFAULT ''
)
RETURNS TABLE (ok boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_hash text;
BEGIN
  IF NOT public._verify_admin_password(p_admin_password, p_rpc_secret) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = 'P0401';
  END IF;

  SELECT value INTO v_hash
  FROM settings
  WHERE key = 'delete_password_hash';

  IF v_hash IS NOT NULL AND v_hash <> '' THEN
    RAISE EXCEPTION 'already_initialized';
  END IF;

  INSERT INTO settings (key, value)
  VALUES ('delete_password_hash', crypt(p_new_password, gen_salt('bf')))
  ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value,
        updated_at = now();

  PERFORM public._audit_log(
    'admin',
    null::uuid,
    'delete_password_change',
    'settings',
    null::uuid,
    'Admin changed delete password.',
    null
  );

  RETURN QUERY SELECT true;
END;
$$;

DROP FUNCTION IF EXISTS public.rpc_admin_bootstrap_password(text);
DROP FUNCTION IF EXISTS public.rpc_admin_bootstrap_password(text, text);
CREATE OR REPLACE FUNCTION public.rpc_admin_bootstrap_password(
  p_new_password text,
  p_rpc_secret text DEFAULT ''
)
RETURNS TABLE (ok boolean)
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
  WHERE key = 'admin_password_hash';

  IF v_hash IS NOT NULL AND v_hash <> '' THEN
    RAISE EXCEPTION 'already_initialized';
  END IF;

  INSERT INTO settings (key, value)
  VALUES ('admin_password_hash', crypt(p_new_password, gen_salt('bf')))
  ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value,
        updated_at = now();

  PERFORM public._audit_log(
    'admin',
    null::uuid,
    'admin_password_change',
    'settings',
    null::uuid,
    'Admin changed admin password.',
    null
  );

  RETURN QUERY SELECT true;
END;
$$;
