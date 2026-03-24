-- ============================================================
-- 005_rpc_project.sql
-- Project RPCs: list (public + admin), create, upsert, delete.
-- Extracted from 000_bootstrap.sql (move-only refactor).
-- ============================================================

DROP FUNCTION IF EXISTS public.rpc_list_projects(uuid, uuid);
CREATE OR REPLACE FUNCTION public.rpc_list_projects(
  p_semester_id uuid,
  p_juror_id    uuid
)
RETURNS TABLE (
  project_id         uuid,
  group_no           integer,
  project_title      text,
  group_students     text,
  poster_date        date,
  criteria_scores    jsonb,
  total              integer,
  comment            text,
  updated_at         timestamptz,
  final_submitted_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT
    p.id             AS project_id,
    p.group_no,
    p.project_title,
    p.group_students,
    COALESCE(s.poster_date, sem.poster_date) AS poster_date,
    s.criteria_scores,
    s.total,
    s.comment,
    s.updated_at,
    s.final_submitted_at
  FROM projects p
  JOIN semesters sem
    ON sem.id = p.semester_id
  LEFT JOIN scores s
    ON  s.project_id  = p.id
    AND s.semester_id = p_semester_id
    AND s.juror_id    = p_juror_id
  WHERE p.semester_id = p_semester_id
  ORDER BY p.group_no;
$$;

DROP FUNCTION IF EXISTS public.rpc_admin_list_projects(uuid, text);
CREATE OR REPLACE FUNCTION public.rpc_admin_list_projects(
  p_semester_id uuid,
  p_admin_password text,
  p_rpc_secret     text DEFAULT ''
)
RETURNS TABLE (
  id uuid,
  semester_id uuid,
  group_no integer,
  project_title text,
  group_students text,
  updated_at timestamptz
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
    SELECT p.id, p.semester_id, p.group_no, p.project_title, p.group_students, p.updated_at
    FROM projects p
    WHERE p.semester_id = p_semester_id
    ORDER BY p.group_no ASC;
END;
$$;

DROP FUNCTION IF EXISTS public.rpc_admin_create_project(uuid, integer, text, text, text);
CREATE OR REPLACE FUNCTION public.rpc_admin_create_project(
  p_semester_id uuid,
  p_group_no integer,
  p_project_title text,
  p_group_students text,
  p_admin_password text,
  p_rpc_secret     text DEFAULT ''
)
RETURNS TABLE (project_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_id       uuid;
  v_sem_name text;
  v_sem_locked boolean := false;
BEGIN
  IF NOT public._verify_admin_password(p_admin_password, p_rpc_secret) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = 'P0401';
  END IF;

  SELECT name, COALESCE(is_locked, false)
    INTO v_sem_name, v_sem_locked
  FROM semesters
  WHERE id = p_semester_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'semester_not_found';
  END IF;

  IF v_sem_locked THEN
    RAISE EXCEPTION 'semester_locked';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM projects
    WHERE semester_id = p_semester_id
      AND group_no = p_group_no
  ) THEN
    RAISE EXCEPTION 'project_group_exists';
  END IF;

  INSERT INTO projects (semester_id, group_no, project_title, group_students)
  VALUES (p_semester_id, p_group_no, p_project_title, p_group_students)
  RETURNING id INTO v_id;

  -- Seed empty score rows for all jurors assigned to this semester.
  INSERT INTO scores (semester_id, project_id, juror_id, poster_date)
  SELECT jsa.semester_id, v_id, jsa.juror_id, sem.poster_date
  FROM juror_semester_auth jsa
  JOIN semesters sem ON sem.id = jsa.semester_id
  WHERE jsa.semester_id = p_semester_id
  ON CONFLICT ON CONSTRAINT scores_unique_eval DO NOTHING;

  PERFORM public._audit_log(
    'admin',
    null::uuid,
    'project_create',
    'project',
    v_id,
    format('Admin created project Group %s — %s (%s).', p_group_no, p_project_title, COALESCE(v_sem_name, p_semester_id::text)),
    jsonb_build_object('semester_id', p_semester_id, 'group_no', p_group_no, 'semester_name', v_sem_name)
  );

  RETURN QUERY SELECT v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_admin_upsert_project(
  p_semester_id uuid,
  p_group_no integer,
  p_project_title text,
  p_group_students text,
  p_admin_password text,
  p_rpc_secret     text DEFAULT ''
)
RETURNS TABLE (project_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_id       uuid;
  v_created  boolean := false;
  v_action   text;
  v_message  text;
  v_sem_name text;
  v_sem_locked boolean := false;
BEGIN
  IF NOT public._verify_admin_password(p_admin_password, p_rpc_secret) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = 'P0401';
  END IF;

  SELECT name, COALESCE(is_locked, false)
    INTO v_sem_name, v_sem_locked
  FROM semesters
  WHERE id = p_semester_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'semester_not_found';
  END IF;

  IF v_sem_locked THEN
    RAISE EXCEPTION 'semester_locked';
  END IF;

  SELECT id INTO v_id
  FROM projects
  WHERE semester_id = p_semester_id
    AND group_no = p_group_no
  LIMIT 1;

  IF v_id IS NULL THEN
    INSERT INTO projects (semester_id, group_no, project_title, group_students)
    VALUES (p_semester_id, p_group_no, p_project_title, p_group_students)
    RETURNING id INTO v_id;
    v_created := true;
  ELSE
    UPDATE projects
    SET project_title = p_project_title,
        group_students = p_group_students
    WHERE id = v_id;
  END IF;

  v_action := CASE WHEN v_created THEN 'project_create' ELSE 'project_update' END;
  v_message := CASE
    WHEN v_created THEN format('Admin created project Group %s — %s (%s).', p_group_no, p_project_title, COALESCE(v_sem_name, p_semester_id::text))
    ELSE format('Admin updated project Group %s — %s (%s).', p_group_no, p_project_title, COALESCE(v_sem_name, p_semester_id::text))
  END;

  PERFORM public._audit_log(
    'admin',
    null::uuid,
    v_action,
    'project',
    v_id,
    v_message,
    jsonb_build_object('semester_id', p_semester_id, 'group_no', p_group_no, 'semester_name', v_sem_name)
  );

  RETURN QUERY SELECT v_id;
END;
$$;

DROP FUNCTION IF EXISTS public.rpc_admin_delete_project(uuid, text);
DROP FUNCTION IF EXISTS public.rpc_admin_delete_project(uuid, text, text);
CREATE OR REPLACE FUNCTION public.rpc_admin_delete_project(
  p_project_id uuid,
  p_delete_password text,
  p_rpc_secret text DEFAULT ''
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_title text;
  v_group integer;
  v_semester_id uuid;
  v_sem_locked boolean := false;
  v_has_scored_data boolean := false;
BEGIN
  PERFORM public._verify_rpc_secret(p_rpc_secret);
  PERFORM public._assert_delete_password(p_delete_password);

  SELECT project_title, group_no, semester_id
    INTO v_title, v_group, v_semester_id
  FROM projects
  WHERE id = p_project_id;

  IF v_semester_id IS NULL THEN
    RAISE EXCEPTION 'project_not_found';
  END IF;

  SELECT COALESCE(is_locked, false)
    INTO v_sem_locked
  FROM semesters
  WHERE id = v_semester_id;

  IF v_sem_locked THEN
    RAISE EXCEPTION 'semester_locked';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM scores s
    WHERE s.project_id = p_project_id
      AND (
        s.final_submitted_at IS NOT NULL
        OR (s.criteria_scores IS NOT NULL AND s.criteria_scores <> '{}'::jsonb)
      )
  ) INTO v_has_scored_data;

  IF v_has_scored_data THEN
    RAISE EXCEPTION 'project_has_scored_data';
  END IF;

  DELETE FROM projects WHERE id = p_project_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'project_not_found';
  END IF;

  PERFORM public._audit_log(
    'admin',
    null::uuid,
    'project_delete',
    'project',
    p_project_id,
    format(
      'Admin deleted project Group %s — %s.',
      COALESCE(v_group::text, '?'),
      COALESCE(v_title, p_project_id::text)
    ),
    jsonb_build_object(
      'group_no', v_group,
      'semester_id', v_semester_id
    )
  );

  RETURN true;
END;
$$;
