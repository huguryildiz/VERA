-- ============================================================
-- 004_rpc_semester.sql
-- Semester RPCs: list, get_active, set_active, create, update, delete.
-- Extracted from 000_bootstrap.sql (move-only refactor).
-- ============================================================

-- ── Public RPCs ─────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.rpc_list_semesters();
CREATE OR REPLACE FUNCTION public.rpc_list_semesters()
RETURNS TABLE (
  id                uuid,
  name              text,
  is_active         boolean,
  is_locked         boolean,
  poster_date       date,
  updated_at        timestamptz,
  criteria_template jsonb,
  mudek_template    jsonb
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT id, name, is_active, is_locked, poster_date, updated_at, criteria_template, mudek_template
  FROM semesters
  ORDER BY poster_date DESC NULLS LAST;
$$;

DROP FUNCTION IF EXISTS public.rpc_get_active_semester();
CREATE OR REPLACE FUNCTION public.rpc_get_active_semester()
RETURNS TABLE (
  id          uuid,
  name        text,
  is_active   boolean,
  is_locked   boolean,
  poster_date date
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT id, name, is_active, is_locked, poster_date
  FROM semesters
  WHERE is_active = true
  LIMIT 1;
$$;

-- ── Admin manage RPCs ───────────────────────────────────────

CREATE OR REPLACE FUNCTION public.rpc_admin_set_active_semester(
  p_semester_id uuid,
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
BEGIN
  IF NOT public._verify_admin_password(p_admin_password, p_rpc_secret) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = 'P0401';
  END IF;

  SELECT name INTO v_name FROM semesters WHERE id = p_semester_id;
  IF v_name IS NULL THEN
    RAISE EXCEPTION 'semester_not_found';
  END IF;

  UPDATE semesters
  SET is_active = false
  WHERE id <> p_semester_id;

  UPDATE semesters
  SET is_active = true
  WHERE id = p_semester_id;

  PERFORM public._audit_log(
    'admin',
    null::uuid,
    'set_active_semester',
    'semester',
    p_semester_id,
    format('Admin set active semester to %s.', COALESCE(v_name, p_semester_id::text)),
    null
  );

  RETURN true;
END;
$$;

DROP FUNCTION IF EXISTS public.rpc_admin_create_semester(text, date, date, text);
DROP FUNCTION IF EXISTS public.rpc_admin_create_semester(text, date, text);
DROP FUNCTION IF EXISTS public.rpc_admin_create_semester(text, date, text, text);
DROP FUNCTION IF EXISTS public.rpc_admin_create_semester(text, date, jsonb, text, text);
CREATE OR REPLACE FUNCTION public.rpc_admin_create_semester(
  p_name               text,
  p_poster_date        date,
  p_criteria_template  jsonb DEFAULT NULL,
  p_mudek_template     jsonb DEFAULT NULL,
  p_admin_password     text DEFAULT '',
  p_rpc_secret         text DEFAULT ''
)
RETURNS TABLE (
  id                uuid,
  name              text,
  is_active         boolean,
  poster_date       date,
  criteria_template jsonb,
  mudek_template    jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
#variable_conflict use_column
DECLARE
  v_id                uuid;
  v_name              text;
  v_active            boolean;
  v_poster_date       date;
  v_criteria_template jsonb;
  v_mudek_template    jsonb;
BEGIN
  IF NOT public._verify_admin_password(p_admin_password, p_rpc_secret) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = 'P0401';
  END IF;

  v_name := trim(p_name);
  IF v_name IS NULL OR v_name = '' THEN
    RAISE EXCEPTION 'semester_name_required';
  END IF;
  IF EXISTS (
    SELECT 1 FROM semesters s
    WHERE lower(trim(s.name)) = lower(v_name)
  ) THEN
    RAISE EXCEPTION 'semester_name_exists';
  END IF;

  INSERT INTO semesters (name, is_active, poster_date, criteria_template, mudek_template)
  VALUES (
    v_name,
    false,
    p_poster_date,
    COALESCE(p_criteria_template, '[]'::jsonb),
    COALESCE(p_mudek_template, '[]'::jsonb)
  )
  RETURNING semesters.id, semesters.name, semesters.is_active, semesters.poster_date,
            semesters.criteria_template, semesters.mudek_template
    INTO v_id, v_name, v_active, v_poster_date, v_criteria_template, v_mudek_template;

  PERFORM public._audit_log(
    'admin',
    null::uuid,
    'semester_create',
    'semester',
    v_id,
    format('Admin created semester %s.', v_name),
    jsonb_build_object('poster_date', v_poster_date)
  );

  RETURN QUERY SELECT v_id, v_name, v_active, v_poster_date, v_criteria_template, v_mudek_template;
END;
$$;

DROP FUNCTION IF EXISTS public.rpc_admin_update_semester(uuid, text, date, date, text);
DROP FUNCTION IF EXISTS public.rpc_admin_update_semester(uuid, text, date, jsonb, text, text);
-- p_criteria_template / p_mudek_template: if NULL, the existing value is preserved.
-- Pass an explicit value (even '[]') to update the template.
CREATE OR REPLACE FUNCTION public.rpc_admin_update_semester(
  p_semester_id        uuid,
  p_name               text,
  p_poster_date        date,
  p_criteria_template  jsonb DEFAULT NULL,
  p_mudek_template     jsonb DEFAULT NULL,
  p_admin_password     text DEFAULT '',
  p_rpc_secret         text DEFAULT ''
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_name text;
  v_has_scores boolean := false;
BEGIN
  IF NOT public._verify_admin_password(p_admin_password, p_rpc_secret) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = 'P0401';
  END IF;

  v_name := trim(p_name);
  IF v_name IS NULL OR v_name = '' THEN
    RAISE EXCEPTION 'semester_name_required';
  END IF;
  IF EXISTS (
    SELECT 1 FROM semesters s
    WHERE lower(trim(s.name)) = lower(v_name)
      AND s.id <> p_semester_id
  ) THEN
    RAISE EXCEPTION 'semester_name_exists';
  END IF;

  -- Once a semester is eval-locked OR has any score activity, criteria/mudek templates
  -- become immutable. Name/poster_date updates remain allowed.
  IF p_criteria_template IS NOT NULL OR p_mudek_template IS NOT NULL THEN
    -- Check is_locked flag first (set explicitly by admin before scoring begins).
    IF EXISTS (SELECT 1 FROM semesters WHERE id = p_semester_id AND is_locked = TRUE) THEN
      RAISE EXCEPTION 'semester_template_locked_by_scores';
    END IF;
    -- Also block if any score activity has started.
    SELECT EXISTS (
      SELECT 1
      FROM scores sc
      WHERE sc.semester_id = p_semester_id
        AND (
          sc.final_submitted_at IS NOT NULL
          OR (sc.criteria_scores IS NOT NULL AND sc.criteria_scores <> '{}'::jsonb)
        )
    ) INTO v_has_scores;
    IF v_has_scores THEN
      RAISE EXCEPTION 'semester_template_locked_by_scores';
    END IF;
  END IF;

  UPDATE semesters
  SET name              = v_name,
      poster_date       = p_poster_date,
      -- Only overwrite templates when an explicit value is provided
      criteria_template = COALESCE(p_criteria_template, criteria_template),
      mudek_template    = COALESCE(p_mudek_template, mudek_template)
  WHERE id = p_semester_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'semester_not_found';
  END IF;

  PERFORM public._audit_log(
    'admin',
    null::uuid,
    'semester_update',
    'semester',
    p_semester_id,
    format('Admin updated semester %s.', v_name),
    null
  );

  RETURN true;
END;
$$;

DROP FUNCTION IF EXISTS public.rpc_admin_delete_semester(uuid, text);
DROP FUNCTION IF EXISTS public.rpc_admin_delete_semester(uuid, text, text);
CREATE OR REPLACE FUNCTION public.rpc_admin_delete_semester(
  p_semester_id uuid,
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

  SELECT name INTO v_name FROM semesters WHERE id = p_semester_id;

  DELETE FROM semesters WHERE id = p_semester_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'semester_not_found';
  END IF;

  PERFORM public._audit_log(
    'admin',
    null::uuid,
    'semester_delete',
    'semester',
    p_semester_id,
    format('Admin deleted semester %s.', COALESCE(v_name, p_semester_id::text)),
    null
  );

  RETURN true;
END;
$$;
