-- ============================================================
-- 006_rpc_juror.sql
-- Juror RPCs: create, update, delete, delete_counts, reset_pin,
-- list, set_edit_mode, force_close_edit_mode, get_edit_state.
-- Extracted from 000_bootstrap.sql (move-only refactor).
-- ============================================================

CREATE OR REPLACE FUNCTION public.rpc_admin_create_juror(
  p_juror_name text,
  p_juror_inst text,
  p_admin_password text,
  p_rpc_secret     text DEFAULT ''
)
RETURNS TABLE (juror_id uuid, juror_name text, juror_inst text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
#variable_conflict use_column
DECLARE
  v_norm_name text;
  v_norm_inst text;
  v_id uuid;
  v_name text;
  v_inst text;
  v_created boolean := false;
  v_active_semester uuid;
  v_pin text;
  v_hash text;
BEGIN
  IF NOT public._verify_admin_password(p_admin_password, p_rpc_secret) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = 'P0401';
  END IF;

  v_norm_name := lower(regexp_replace(trim(coalesce(p_juror_name, '')), '\\s+', ' ', 'g'));
  v_norm_inst := lower(regexp_replace(trim(coalesce(p_juror_inst, '')), '\\s+', ' ', 'g'));

  SELECT j.id, j.juror_name, j.juror_inst
    INTO v_id, v_name, v_inst
  FROM jurors j
  WHERE lower(regexp_replace(trim(coalesce(j.juror_name, '')), '\\s+', ' ', 'g')) = v_norm_name
    AND lower(regexp_replace(trim(coalesce(j.juror_inst, '')), '\\s+', ' ', 'g')) = v_norm_inst
  LIMIT 1;

  IF v_id IS NOT NULL THEN
    RAISE EXCEPTION 'juror_exists';
  END IF;

  INSERT INTO jurors (juror_name, juror_inst)
  VALUES (trim(p_juror_name), trim(p_juror_inst))
  RETURNING jurors.id, jurors.juror_name, jurors.juror_inst
  INTO v_id, v_name, v_inst;

  SELECT id INTO v_active_semester
  FROM semesters
  WHERE is_active = true
  ORDER BY updated_at DESC
  LIMIT 1;

  IF v_active_semester IS NOT NULL THEN
    v_pin := lpad((('x' || encode(gen_random_bytes(2), 'hex'))::bit(16)::int % 10000)::text, 4, '0');
    v_hash := crypt(v_pin, gen_salt('bf'));

    INSERT INTO juror_semester_auth (juror_id, semester_id, pin_hash)
    VALUES (v_id, v_active_semester, v_hash)
    ON CONFLICT (juror_id, semester_id) DO NOTHING;

    INSERT INTO scores (semester_id, project_id, juror_id, poster_date)
    SELECT p.semester_id, p.id, v_id, s.poster_date
    FROM projects p
    JOIN semesters s ON s.id = p.semester_id
    WHERE p.semester_id = v_active_semester
    ON CONFLICT ON CONSTRAINT scores_unique_eval DO NOTHING;
  END IF;

  PERFORM public._audit_log(
    'admin',
    null::uuid,
    'juror_create',
    'juror',
    v_id,
    format(
      'Admin created juror %s%s.',
      COALESCE(v_name, ''),
      CASE
        WHEN COALESCE(NULLIF(trim(v_inst), ''), '') = '' THEN ''
        ELSE format(' (%s)', v_inst)
      END
    ),
    null
  );

  RETURN QUERY SELECT v_id, v_name, v_inst;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_admin_update_juror(
  p_juror_id uuid,
  p_juror_name text,
  p_juror_inst text,
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

  IF trim(coalesce(p_juror_name, '')) = '' OR trim(coalesce(p_juror_inst, '')) = '' THEN
    RAISE EXCEPTION 'invalid_juror';
  END IF;

  UPDATE jurors
  SET juror_name = trim(p_juror_name),
      juror_inst = trim(p_juror_inst)
  WHERE id = p_juror_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'juror_not_found';
  END IF;

  PERFORM public._audit_log(
    'admin',
    null::uuid,
    'juror_update',
    'juror',
    p_juror_id,
    format('Admin updated juror %s.', trim(p_juror_name)),
    null
  );

  RETURN true;
END;
$$;

DROP FUNCTION IF EXISTS public.rpc_admin_delete_juror(uuid, text);
DROP FUNCTION IF EXISTS public.rpc_admin_delete_juror(uuid, text, text);
CREATE OR REPLACE FUNCTION public.rpc_admin_delete_juror(
  p_juror_id uuid,
  p_delete_password text,
  p_rpc_secret text DEFAULT ''
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_name text;
BEGIN
  PERFORM public._verify_rpc_secret(p_rpc_secret);
  PERFORM public._assert_delete_password(p_delete_password);

  SELECT juror_name INTO v_name FROM jurors WHERE id = p_juror_id;

  DELETE FROM jurors WHERE id = p_juror_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'juror_not_found';
  END IF;

  PERFORM public._audit_log(
    'admin',
    null::uuid,
    'juror_delete',
    'juror',
    p_juror_id,
    format('Admin deleted juror %s.', COALESCE(v_name, p_juror_id::text)),
    null
  );

  RETURN true;
END;
$$;

DROP FUNCTION IF EXISTS public.rpc_admin_delete_counts(text, uuid, text);
CREATE OR REPLACE FUNCTION public.rpc_admin_delete_counts(
  p_type text,
  p_id   uuid,
  p_admin_password text,
  p_rpc_secret     text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_projects    bigint := 0;
  v_scores      bigint := 0;
  v_juror_auths bigint := 0;
  v_semesters   bigint := 0;
BEGIN
  IF NOT public._verify_admin_password(p_admin_password, p_rpc_secret) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = 'P0401';
  END IF;

  IF p_type = 'semester' THEN
    SELECT COUNT(*) INTO v_projects FROM projects WHERE semester_id = p_id;
    SELECT COUNT(*) INTO v_scores
    FROM scores
    WHERE semester_id = p_id
      AND (
        final_submitted_at IS NOT NULL
        OR (criteria_scores IS NOT NULL AND criteria_scores <> '{}'::jsonb)
      );
    SELECT COUNT(*) INTO v_juror_auths FROM juror_semester_auth WHERE semester_id = p_id;
    RETURN jsonb_build_object('projects', v_projects, 'scores', v_scores, 'juror_auths', v_juror_auths);

  ELSIF p_type = 'project' THEN
    SELECT COUNT(*) INTO v_scores
    FROM scores
    WHERE project_id = p_id
      AND (
        final_submitted_at IS NOT NULL
        OR (criteria_scores IS NOT NULL AND criteria_scores <> '{}'::jsonb)
      );
    RETURN jsonb_build_object('scores', v_scores);

  ELSIF p_type = 'juror' THEN
    SELECT COUNT(DISTINCT semester_id) INTO v_semesters
    FROM scores
    WHERE juror_id = p_id
      AND final_submitted_at IS NOT NULL;
    SELECT COUNT(*) INTO v_scores
    FROM scores
    WHERE juror_id = p_id
      AND final_submitted_at IS NOT NULL;
    SELECT COUNT(*) INTO v_juror_auths FROM juror_semester_auth WHERE juror_id = p_id;
    RETURN jsonb_build_object('scores', v_scores, 'juror_auths', v_juror_auths, 'active_semesters', v_semesters);

  ELSE
    RAISE EXCEPTION 'unsupported_type';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_admin_reset_juror_pin(
  p_semester_id uuid,
  p_juror_id uuid,
  p_admin_password text,
  p_rpc_secret     text DEFAULT ''
)
RETURNS TABLE (juror_id uuid, pin_plain_once text, failed_attempts integer, locked_until timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
#variable_conflict use_column
DECLARE
  v_pin text;
  v_hash text;
  v_juror_name text;
  v_juror_inst text;
  v_label text;
  v_secret text;
  v_pin_enc text;
BEGIN
  IF NOT public._verify_admin_password(p_admin_password, p_rpc_secret) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = 'P0401';
  END IF;

  v_pin := lpad((('x' || encode(gen_random_bytes(2), 'hex'))::bit(16)::int % 10000)::text, 4, '0');
  v_hash := crypt(v_pin, gen_salt('bf'));
  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = 'pin_secret'
  LIMIT 1;
  IF v_secret IS NULL OR v_secret = '' THEN
    RAISE EXCEPTION 'pin_secret_missing';
  END IF;
  v_pin_enc := 'enc:' || encode(pgp_sym_encrypt(v_pin, v_secret), 'base64');

  SELECT juror_name, juror_inst
    INTO v_juror_name, v_juror_inst
  FROM jurors
  WHERE id = p_juror_id;

  v_label := COALESCE(NULLIF(trim(v_juror_name), ''), p_juror_id::text);
  IF COALESCE(NULLIF(trim(v_juror_inst), ''), '') <> '' THEN
    v_label := v_label || format(' (%s)', v_juror_inst);
  END IF;

  INSERT INTO juror_semester_auth (juror_id, semester_id, pin_hash, pin_reveal_pending, pin_plain_once, failed_attempts, locked_until)
  VALUES (p_juror_id, p_semester_id, v_hash, true, v_pin_enc, 0, null)
  ON CONFLICT (juror_id, semester_id) DO UPDATE
    SET pin_hash = EXCLUDED.pin_hash,
        failed_attempts = 0,
        locked_until = null,
        pin_reveal_pending = true,
        pin_plain_once = EXCLUDED.pin_plain_once,
        last_seen_at = null;

  INSERT INTO scores (semester_id, project_id, juror_id, poster_date)
  SELECT p_semester_id, p.id, p_juror_id, s.poster_date
  FROM projects p
  JOIN semesters s ON s.id = p_semester_id
  WHERE p.semester_id = p_semester_id
  ON CONFLICT ON CONSTRAINT scores_unique_eval DO NOTHING;

  PERFORM public._audit_log(
    'admin',
    null::uuid,
    'juror_pin_reset',
    'juror',
    p_juror_id,
    format('Admin reset PIN for juror %s.', v_label),
    jsonb_build_object('semester_id', p_semester_id)
  );

  RETURN QUERY SELECT p_juror_id, v_pin, 0, null::timestamptz;
END;
$$;

DROP FUNCTION IF EXISTS public.rpc_admin_list_jurors(text, uuid);
CREATE OR REPLACE FUNCTION public.rpc_admin_list_jurors(
  p_admin_password text,
  p_semester_id    uuid,
  p_rpc_secret     text DEFAULT ''
)
RETURNS TABLE (
  juror_id uuid,
  juror_name text,
  juror_inst text,
  updated_at timestamptz,
  locked_until timestamptz,
  last_seen_at timestamptz,
  is_locked boolean,
  is_assigned boolean,
  scored_semesters text[],
  edit_enabled boolean,
  final_submitted_at timestamptz,
  last_activity_at timestamptz,
  total_projects integer,
  completed_projects integer
)
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
    WITH total AS (
      SELECT COUNT(*)::int AS total_projects
      FROM projects p
      WHERE p.semester_id = p_semester_id
    ),
    completed AS (
      SELECT sc.juror_id, COUNT(*)::int AS completed_projects
      FROM scores sc
      WHERE sc.semester_id = p_semester_id
        AND sc.criteria_scores IS NOT NULL
        AND sc.criteria_scores <> '{}'::jsonb
      GROUP BY sc.juror_id
    )
    SELECT
      j.id,
      j.juror_name,
      j.juror_inst,
      j.updated_at,
      a.locked_until,
      a.last_seen_at,
      (a.locked_until IS NOT NULL AND a.locked_until > now()) AS is_locked,
      (
        a.juror_id IS NOT NULL
        OR EXISTS (
          SELECT 1
          FROM scores sc2
          WHERE sc2.semester_id = p_semester_id
            AND sc2.juror_id = j.id
        )
      ) AS is_assigned,
      COALESCE(ss.scored_semesters, ARRAY[]::text[]),
      COALESCE(a.edit_enabled, false) AS edit_enabled,
      fs.final_submitted_at,
      la.last_activity_at,
      COALESCE(t.total_projects, 0) AS total_projects,
      COALESCE(c.completed_projects, 0) AS completed_projects
    FROM jurors j
    LEFT JOIN juror_semester_auth a
      ON a.juror_id = j.id
     AND a.semester_id = p_semester_id
    LEFT JOIN total t ON true
    LEFT JOIN completed c
      ON c.juror_id = j.id
    LEFT JOIN LATERAL (
      SELECT MAX(sc.final_submitted_at) AS final_submitted_at
      FROM scores sc
      WHERE sc.juror_id = j.id
        AND sc.semester_id = p_semester_id
    ) AS fs ON true
    LEFT JOIN LATERAL (
      SELECT GREATEST(MAX(sc.updated_at), MAX(sc.final_submitted_at)) AS last_activity_at
      FROM scores sc
      WHERE sc.juror_id = j.id
        AND sc.semester_id = p_semester_id
    ) AS la ON true
    LEFT JOIN LATERAL (
      SELECT array_agg(x.name ORDER BY x.poster_date DESC NULLS LAST) AS scored_semesters
      FROM (
        SELECT DISTINCT s.id, s.name, s.poster_date
        FROM scores sc
        JOIN semesters s ON s.id = sc.semester_id
        WHERE sc.juror_id = j.id
          AND sc.final_submitted_at IS NOT NULL
      ) AS x
    ) AS ss ON true
    ORDER BY j.juror_name;
END;
$$;

-- ── Admin: enable per-juror edit mode (one-way) ─────────────

DROP FUNCTION IF EXISTS public.rpc_admin_set_juror_edit_mode(uuid, uuid, boolean, text);
CREATE OR REPLACE FUNCTION public.rpc_admin_set_juror_edit_mode(
  p_semester_id uuid,
  p_juror_id uuid,
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
  v_name text;
  v_sem_name text;
  v_has_final_submission boolean := false;
  v_sem_locked boolean := false;
BEGIN
  IF NOT public._verify_admin_password(p_admin_password, p_rpc_secret) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = 'P0401';
  END IF;

  SELECT COALESCE(s.is_locked, false)
    INTO v_sem_locked
  FROM semesters s
  WHERE s.id = p_semester_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'semester_not_found';
  END IF;

  IF v_sem_locked THEN
    RAISE EXCEPTION 'semester_locked';
  END IF;

  IF COALESCE(p_enabled, false) = false THEN
    RAISE EXCEPTION 'edit_mode_disable_not_allowed';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM scores sc
    WHERE sc.semester_id = p_semester_id
      AND sc.juror_id = p_juror_id
      AND sc.final_submitted_at IS NOT NULL
  ) INTO v_has_final_submission;

  IF NOT v_has_final_submission THEN
    RAISE EXCEPTION 'final_submission_required';
  END IF;

  UPDATE juror_semester_auth
  SET edit_enabled = true
  WHERE juror_id = p_juror_id
    AND semester_id = p_semester_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'no_pin';
  END IF;

  SELECT juror_name INTO v_name FROM jurors WHERE id = p_juror_id;
  SELECT name INTO v_sem_name FROM semesters WHERE id = p_semester_id;
  PERFORM public._audit_log(
    'admin',
    null::uuid,
    'admin_juror_edit_toggle',
    'juror',
    p_juror_id,
    format(
      'Admin enabled edit mode for Juror %s (%s).',
      COALESCE(v_name, p_juror_id::text),
      COALESCE(v_sem_name, p_semester_id::text)
    ),
    jsonb_build_object('semester_id', p_semester_id, 'enabled', true)
  );

  RETURN true;
END;
$$;

-- ── Admin: force-close per-juror edit mode ──────────────────

DROP FUNCTION IF EXISTS public.rpc_admin_force_close_juror_edit_mode(uuid, uuid, text);
CREATE OR REPLACE FUNCTION public.rpc_admin_force_close_juror_edit_mode(
  p_semester_id uuid,
  p_juror_id uuid,
  p_admin_password text,
  p_rpc_secret     text DEFAULT ''
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_name text;
  v_sem_name text;
BEGIN
  IF NOT public._verify_admin_password(p_admin_password, p_rpc_secret) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = 'P0401';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM semesters s
    WHERE s.id = p_semester_id
  ) THEN
    RAISE EXCEPTION 'semester_not_found';
  END IF;

  UPDATE juror_semester_auth
  SET edit_enabled = false
  WHERE juror_id = p_juror_id
    AND semester_id = p_semester_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'no_pin';
  END IF;

  SELECT juror_name INTO v_name FROM jurors WHERE id = p_juror_id;
  SELECT name INTO v_sem_name FROM semesters WHERE id = p_semester_id;
  PERFORM public._audit_log(
    'admin',
    null::uuid,
    'admin_juror_edit_force_close',
    'juror',
    p_juror_id,
    format(
      'Admin force-closed edit mode for Juror %s (%s).',
      COALESCE(v_name, p_juror_id::text),
      COALESCE(v_sem_name, p_semester_id::text)
    ),
    jsonb_build_object('semester_id', p_semester_id, 'enabled', false)
  );

  RETURN true;
END;
$$;

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
  v_sem_active boolean := false;
BEGIN
  PERFORM public._assert_juror_session(p_semester_id, p_juror_id, p_session_token);

  SELECT s.is_active, COALESCE(s.is_locked, false)
    INTO v_sem_active, v_lock
  FROM semesters s
  WHERE s.id = p_semester_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, false, false;
    RETURN;
  END IF;

  -- If semester is inactive, signal a lock to the frontend
  IF NOT v_sem_active THEN
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
