-- ============================================================
-- 005_jury_data_rpcs.sql
-- Jury data RPCs rewritten with canonical column names.
--
-- Column renames applied:
--   semesters.name       → semesters.semester_name
--   semesters.is_active  → semesters.is_current
--   tenants.name         → tenants.short_label
--
-- Schema additions respected:
--   scores.tenant_id  (looked up from semesters at insert time)
--
-- Function renames:
--   rpc_get_active_semester → rpc_get_current_semester
--
-- RPCs in this file:
--   rpc_list_semesters
--   rpc_get_current_semester  (was rpc_get_active_semester)
--   rpc_list_projects
--   rpc_upsert_score
--   rpc_verify_semester_entry_token
-- ============================================================

-- ── rpc_list_semesters ──────────────────────────────────────

DROP FUNCTION IF EXISTS public.rpc_list_semesters();
CREATE OR REPLACE FUNCTION public.rpc_list_semesters()
RETURNS TABLE (
  id                uuid,
  semester_name     text,
  is_current        boolean,
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
  SELECT id, semester_name, is_current, is_locked, poster_date, updated_at, criteria_template, mudek_template
  FROM semesters
  ORDER BY poster_date DESC NULLS LAST;
$$;

-- ── rpc_get_current_semester (was rpc_get_active_semester) ──

DROP FUNCTION IF EXISTS public.rpc_get_active_semester();
DROP FUNCTION IF EXISTS public.rpc_get_current_semester();
CREATE OR REPLACE FUNCTION public.rpc_get_current_semester()
RETURNS TABLE (
  id          uuid,
  semester_name text,
  is_current  boolean,
  is_locked   boolean,
  poster_date date,
  university  text,
  department  text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT s.id, s.semester_name, s.is_current, s.is_locked, s.poster_date,
         t.university, t.department
  FROM semesters s
  LEFT JOIN tenants t ON t.id = s.tenant_id
  WHERE s.is_current = true
  LIMIT 1;
$$;

-- ── rpc_list_projects ───────────────────────────────────────

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

-- ── rpc_upsert_score ────────────────────────────────────────

DROP FUNCTION IF EXISTS public.rpc_upsert_score(uuid, uuid, uuid, integer, integer, integer, integer, text);
DROP FUNCTION IF EXISTS public.rpc_upsert_score(uuid, uuid, uuid, text, integer, integer, integer, integer, text);
DROP FUNCTION IF EXISTS public.rpc_upsert_score(uuid, uuid, uuid, text, jsonb, text);
CREATE OR REPLACE FUNCTION public.rpc_upsert_score(
  p_semester_id     uuid,
  p_project_id      uuid,
  p_juror_id        uuid,
  p_session_token   text,
  p_criteria_scores jsonb,
  p_comment         text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_total          integer;
  v_template       jsonb;
  v_crit           jsonb;
  v_key            text;
  v_max            integer;
  v_val            text;
  v_prev           scores%ROWTYPE;
  v_had_any        boolean := false;
  v_had_complete   boolean := false;
  v_now_any        boolean := false;
  v_now_complete   boolean := false;
  v_completed_before integer := 0;
  v_completed_after  integer := 0;
  v_total_projects   integer := 0;
  v_before_all     boolean := false;
  v_after_all      boolean := false;
  v_group_no       integer;
  v_project_title  text;
  v_juror_name     text;
  v_sem_name       text;
  v_new_cs         jsonb;
  v_new_comment    text;
  v_sem_locked     boolean := false;
  v_sem_current    boolean := false;
  v_tenant_id      uuid;
BEGIN
  -- Look up semester state and tenant_id
  SELECT COALESCE(s.is_locked, false), COALESCE(s.is_current, false), s.tenant_id
    INTO v_sem_locked, v_sem_current, v_tenant_id
  FROM semesters s
  WHERE s.id = p_semester_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'semester_not_found';
  END IF;

  IF v_sem_locked OR NOT v_sem_current THEN
    RAISE EXCEPTION 'semester_locked';
  END IF;

  PERFORM public._assert_juror_session(p_semester_id, p_juror_id, p_session_token);

  -- Validate p_criteria_scores against semester template
  SELECT criteria_template INTO v_template
  FROM semesters WHERE id = p_semester_id;

  IF v_template IS NOT NULL AND jsonb_array_length(v_template) > 0 THEN
    -- Check each template criterion: value must be in [0, max] if provided
    FOR v_crit IN SELECT * FROM jsonb_array_elements(v_template) LOOP
      v_key := v_crit->>'key';
      v_max := (v_crit->>'max')::integer;
      v_val := p_criteria_scores->>v_key;
      IF v_val IS NOT NULL
         AND (v_val::integer < 0 OR v_val::integer > v_max) THEN
        RAISE EXCEPTION 'criteria_score_out_of_range' USING HINT = v_key;
      END IF;
    END LOOP;
    -- Reject keys in input that are absent from the template
    FOR v_key IN SELECT jsonb_object_keys(p_criteria_scores) LOOP
      IF NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements(v_template) t
        WHERE t->>'key' = v_key
      ) THEN
        RAISE EXCEPTION 'criteria_key_unknown' USING HINT = v_key;
      END IF;
    END LOOP;
  END IF;

  SELECT group_no, project_title
    INTO v_group_no, v_project_title
  FROM projects
  WHERE id = p_project_id;

  SELECT juror_name INTO v_juror_name
  FROM jurors
  WHERE id = p_juror_id;

  SELECT semester_name INTO v_sem_name
  FROM semesters
  WHERE id = p_semester_id;

  SELECT * INTO v_prev
  FROM scores
  WHERE semester_id = p_semester_id
    AND project_id  = p_project_id
    AND juror_id    = p_juror_id;

  IF FOUND THEN
    -- had_any: previous criteria_scores had at least one value, or had a comment
    v_had_any := (
      (v_prev.criteria_scores IS NOT NULL
       AND v_prev.criteria_scores <> '{}'::jsonb)
      OR NULLIF(trim(coalesce(v_prev.comment, '')), '') IS NOT NULL
    );
    -- had_complete: all template keys present and non-null in previous scores
    v_had_complete := (
      v_prev.criteria_scores IS NOT NULL
      AND v_template IS NOT NULL
      AND jsonb_array_length(v_template) > 0
      AND (
        SELECT bool_and(v_prev.criteria_scores->>(t->>'key') IS NOT NULL)
        FROM jsonb_array_elements(v_template) t
      )
    );
  END IF;

  SELECT COUNT(*)::int INTO v_total_projects
  FROM projects
  WHERE semester_id = p_semester_id;

  -- Count previously completed groups for this juror
  SELECT COUNT(*)::int INTO v_completed_before
  FROM scores sc
  WHERE sc.semester_id = p_semester_id
    AND sc.juror_id = p_juror_id
    AND sc.criteria_scores IS NOT NULL
    AND sc.criteria_scores <> '{}'::jsonb
    AND (
      SELECT bool_and(sc.criteria_scores->>(t->>'key') IS NOT NULL)
      FROM jsonb_array_elements(COALESCE(v_template, '[]'::jsonb)) t
    );

  -- Insert with tenant_id looked up from the semester
  INSERT INTO scores (
    semester_id, project_id, juror_id,
    criteria_scores, comment, tenant_id
  )
  VALUES (
    p_semester_id, p_project_id, p_juror_id,
    p_criteria_scores, p_comment, v_tenant_id
  )
  ON CONFLICT (semester_id, project_id, juror_id)
  DO UPDATE SET
    criteria_scores = EXCLUDED.criteria_scores,
    comment         = EXCLUDED.comment
  RETURNING total INTO v_total;

  SELECT criteria_scores, comment
    INTO v_new_cs, v_new_comment
  FROM scores
  WHERE semester_id = p_semester_id
    AND project_id  = p_project_id
    AND juror_id    = p_juror_id;

  v_now_any := (
    (v_new_cs IS NOT NULL AND v_new_cs <> '{}'::jsonb)
    OR NULLIF(trim(coalesce(v_new_comment, '')), '') IS NOT NULL
  );
  -- now_complete: all template keys present and non-null
  v_now_complete := (
    v_new_cs IS NOT NULL
    AND v_template IS NOT NULL
    AND jsonb_array_length(v_template) > 0
    AND (
      SELECT bool_and(v_new_cs->>(t->>'key') IS NOT NULL)
      FROM jsonb_array_elements(v_template) t
    )
  );

  SELECT COUNT(*)::int INTO v_completed_after
  FROM scores sc
  WHERE sc.semester_id = p_semester_id
    AND sc.juror_id = p_juror_id
    AND sc.criteria_scores IS NOT NULL
    AND sc.criteria_scores <> '{}'::jsonb
    AND (
      SELECT bool_and(sc.criteria_scores->>(t->>'key') IS NOT NULL)
      FROM jsonb_array_elements(COALESCE(v_template, '[]'::jsonb)) t
    );

  v_before_all := (v_total_projects > 0 AND v_completed_before = v_total_projects);
  v_after_all := (v_total_projects > 0 AND v_completed_after = v_total_projects);

  IF (NOT v_had_any) AND v_now_any THEN
    PERFORM public._audit_log(
      'juror',
      p_juror_id,
      'juror_group_started',
      'project',
      p_project_id,
      format(
        'Juror %s started evaluating Group %s (%s).',
        COALESCE(v_juror_name, p_juror_id::text),
        COALESCE(v_group_no::text, '?'),
        COALESCE(v_sem_name, p_semester_id::text)
      ),
      jsonb_build_object(
        'semester_id', p_semester_id,
        'semester_name', v_sem_name,
        'group_no', v_group_no,
        'project_title', v_project_title
      )
    );
  END IF;

  IF (NOT v_had_complete) AND v_now_complete THEN
    PERFORM public._audit_log(
      'juror',
      p_juror_id,
      'juror_group_completed',
      'project',
      p_project_id,
      format(
        'Juror %s completed evaluation for Group %s (%s).',
        COALESCE(v_juror_name, p_juror_id::text),
        COALESCE(v_group_no::text, '?'),
        COALESCE(v_sem_name, p_semester_id::text)
      ),
      jsonb_build_object(
        'semester_id', p_semester_id,
        'semester_name', v_sem_name,
        'group_no', v_group_no,
        'project_title', v_project_title
      )
    );
  END IF;

  IF (NOT v_before_all) AND v_after_all THEN
    PERFORM public._audit_log(
      'juror',
      p_juror_id,
      'juror_all_completed',
      'semester',
      p_semester_id,
      format(
        'Juror %s completed all project evaluations (%s).',
        COALESCE(v_juror_name, p_juror_id::text),
        COALESCE(v_sem_name, p_semester_id::text)
      ),
      jsonb_build_object(
        'semester_id', p_semester_id,
        'semester_name', v_sem_name,
        'completed_projects', v_completed_after,
        'total_projects', v_total_projects
      )
    );
  END IF;

  RETURN v_total;
END;
$$;

-- ── rpc_verify_semester_entry_token ─────────────────────────

DROP FUNCTION IF EXISTS public.rpc_verify_semester_entry_token(text);
CREATE OR REPLACE FUNCTION public.rpc_verify_semester_entry_token(p_token text)
RETURNS TABLE (ok boolean, semester_id uuid, semester_name text, error_code text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  v_hash text;
  v_sem  public.semesters%ROWTYPE;
BEGIN
  v_hash := encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex');
  SELECT * INTO v_sem FROM public.semesters
  WHERE entry_token_hash = v_hash
    AND entry_token_enabled = true
    AND (entry_token_expires_at IS NULL OR entry_token_expires_at > now())
  LIMIT 1;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, null::uuid, null::text, 'invalid'::text;
    RETURN;
  END IF;
  RETURN QUERY SELECT true, v_sem.id, v_sem.semester_name, null::text;
END;
$$;

-- ── Grants ──────────────────────────────────────────────────

GRANT EXECUTE ON FUNCTION public.rpc_list_semesters() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_get_current_semester() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_list_projects(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_upsert_score(uuid, uuid, uuid, text, jsonb, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_verify_semester_entry_token(text) TO anon, authenticated;
