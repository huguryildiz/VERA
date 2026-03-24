-- ============================================================
-- 007_rpc_score.sql
-- Score RPCs: upsert_score, admin_get_scores, admin_project_summary,
-- admin_outcome_trends, finalize_juror_submission.
-- Extracted from 000_bootstrap.sql (move-only refactor).
-- ============================================================

DROP FUNCTION IF EXISTS public.rpc_upsert_score(uuid, uuid, uuid, integer, integer, integer, integer, text);
DROP FUNCTION IF EXISTS public.rpc_upsert_score(uuid, uuid, uuid, text, integer, integer, integer, integer, text);
-- New JSONB-based signature replaces the 4 fixed integer params
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
  v_sem_active     boolean := false;
BEGIN
  SELECT COALESCE(s.is_locked, false), COALESCE(s.is_active, false)
    INTO v_sem_locked, v_sem_active
  FROM semesters s
  WHERE s.id = p_semester_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'semester_not_found';
  END IF;

  IF v_sem_locked OR NOT v_sem_active THEN
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

  SELECT name INTO v_sem_name
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

  INSERT INTO scores (
    semester_id, project_id, juror_id,
    criteria_scores, comment
  )
  VALUES (
    p_semester_id, p_project_id, p_juror_id,
    p_criteria_scores, p_comment
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

DROP FUNCTION IF EXISTS public.rpc_admin_get_scores(uuid, text);
DROP FUNCTION IF EXISTS public.rpc_admin_get_scores(uuid, text, text);
CREATE OR REPLACE FUNCTION public.rpc_admin_get_scores(
  p_semester_id    uuid,
  p_admin_password text,
  p_rpc_secret     text DEFAULT ''
)
RETURNS TABLE (
  juror_id           uuid,
  juror_name         text,
  juror_inst         text,
  project_id         uuid,
  group_no           integer,
  project_title      text,
  poster_date        date,
  criteria_scores    jsonb,
  total              integer,
  comment            text,
  updated_at         timestamptz,
  final_submitted_at timestamptz,
  status             text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_template jsonb;
BEGIN
  IF NOT public._verify_admin_password(p_admin_password, p_rpc_secret) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = 'P0401';
  END IF;

  SELECT criteria_template INTO v_template
  FROM semesters WHERE id = p_semester_id;

  RETURN QUERY
    SELECT
      j.id              AS juror_id,
      j.juror_name,
      j.juror_inst,
      p.id              AS project_id,
      p.group_no,
      p.project_title,
      s.poster_date,
      s.criteria_scores,
      s.total,
      s.comment,
      s.updated_at,
      s.final_submitted_at,
      -- Status derived from criteria_scores completeness against template
      CASE
        WHEN s.criteria_scores IS NOT NULL
         AND (
           v_template IS NULL OR jsonb_array_length(v_template) = 0
           OR (SELECT bool_and(s.criteria_scores->>(t->>'key') IS NOT NULL)
               FROM jsonb_array_elements(v_template) t)
         )
         AND s.final_submitted_at IS NOT NULL
        THEN 'completed'::text
        WHEN s.criteria_scores IS NOT NULL
         AND (
           v_template IS NULL OR jsonb_array_length(v_template) = 0
           OR (SELECT bool_and(s.criteria_scores->>(t->>'key') IS NOT NULL)
               FROM jsonb_array_elements(v_template) t)
         )
         AND COALESCE(a.edit_enabled, false) = true
         AND s.final_submitted_at IS NULL
        THEN 'editing'::text
        WHEN s.criteria_scores IS NOT NULL
         AND (
           v_template IS NULL OR jsonb_array_length(v_template) = 0
           OR (SELECT bool_and(s.criteria_scores->>(t->>'key') IS NOT NULL)
               FROM jsonb_array_elements(v_template) t)
         )
        THEN 'submitted'::text
        WHEN (s.criteria_scores IS NULL OR s.criteria_scores = '{}'::jsonb)
         AND NULLIF(trim(coalesce(s.comment, '')), '') IS NULL
        THEN 'not_started'::text
        ELSE 'in_progress'::text
      END AS status
    FROM scores s
    JOIN jurors   j ON j.id = s.juror_id
    JOIN projects p ON p.id = s.project_id
    LEFT JOIN juror_semester_auth a
      ON a.juror_id    = s.juror_id
     AND a.semester_id = s.semester_id
    WHERE s.semester_id = p_semester_id
    ORDER BY j.juror_name, p.group_no;
END;
$$;

DROP FUNCTION IF EXISTS public.rpc_admin_project_summary(uuid, text);
DROP FUNCTION IF EXISTS public.rpc_admin_project_summary(uuid, text, text);
CREATE OR REPLACE FUNCTION public.rpc_admin_project_summary(
  p_semester_id    uuid,
  p_admin_password text,
  p_rpc_secret     text DEFAULT ''
)
RETURNS TABLE (
  project_id     uuid,
  group_no       integer,
  project_title  text,
  group_students text,
  juror_count    bigint,
  criteria_avgs  jsonb,
  avg_total      numeric,
  min_total      integer,
  max_total      integer,
  note           text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_template jsonb;
BEGIN
  IF NOT public._verify_admin_password(p_admin_password, p_rpc_secret) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = 'P0401';
  END IF;

  SELECT criteria_template INTO v_template
  FROM semesters WHERE id = p_semester_id;

  RETURN QUERY
    SELECT
      p.id                              AS project_id,
      p.group_no,
      p.project_title,
      p.group_students,
      COUNT(s.juror_id)                 AS juror_count,
      -- criteria_avgs: {key → ROUND(AVG(value), 2)} for each template criterion
      -- Two-level aggregation: GROUP BY key first, then jsonb_object_agg
      -- (PostgreSQL does not allow nested aggregate functions)
      (
        SELECT COALESCE(jsonb_object_agg(key, avg_val), '{}'::jsonb)
        FROM (
          SELECT
            c->>'key'                                               AS key,
            ROUND(AVG((s2.criteria_scores->>(c->>'key'))::numeric), 2) AS avg_val
          FROM jsonb_array_elements(COALESCE(v_template, '[]'::jsonb)) c
          LEFT JOIN scores s2
            ON  s2.project_id  = p.id
            AND s2.semester_id = p_semester_id
            AND s2.criteria_scores IS NOT NULL
            AND s2.final_submitted_at IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM juror_semester_auth a2
              WHERE a2.juror_id    = s2.juror_id
                AND a2.semester_id = s2.semester_id
                AND COALESCE(a2.edit_enabled, false) = false
            )
          GROUP BY c->>'key'
        ) sub
      )                                 AS criteria_avgs,
      ROUND(AVG(s.total),     2)        AS avg_total,
      MIN(s.total)                      AS min_total,
      MAX(s.total)                      AS max_total,
      ''::text                          AS note
    FROM projects p
    LEFT JOIN scores s
      ON  s.project_id  = p.id
      AND s.semester_id = p_semester_id
      AND s.criteria_scores IS NOT NULL
      AND s.final_submitted_at IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM juror_semester_auth a
        WHERE a.juror_id    = s.juror_id
          AND a.semester_id = s.semester_id
          AND COALESCE(a.edit_enabled, false) = false
      )
    WHERE p.semester_id = p_semester_id
    GROUP BY p.id, p.group_no, p.project_title, p.group_students
    ORDER BY p.group_no;
END;
$$;

DROP FUNCTION IF EXISTS public.rpc_admin_outcome_trends(uuid[], text);
DROP FUNCTION IF EXISTS public.rpc_admin_outcome_trends(uuid[], text, text);
CREATE OR REPLACE FUNCTION public.rpc_admin_outcome_trends(
  p_semester_ids   uuid[],
  p_admin_password text,
  p_rpc_secret     text DEFAULT ''
)
RETURNS TABLE (
  semester_id    uuid,
  semester_name  text,
  poster_date    date,
  criteria_avgs  jsonb,
  n_evals        bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NOT public._verify_admin_password(p_admin_password, p_rpc_secret) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = 'P0401';
  END IF;

  RETURN QUERY
    SELECT
      s.id          AS semester_id,
      s.name        AS semester_name,
      s.poster_date,
      -- criteria_avgs: per-key averages derived from each semester's own template
      -- Two-level aggregation: GROUP BY key first, then jsonb_object_agg
      (
        SELECT COALESCE(jsonb_object_agg(key, avg_val), '{}'::jsonb)
        FROM (
          SELECT
            c->>'key'                                                AS key,
            ROUND(AVG((sc2.criteria_scores->>(c->>'key'))::numeric), 2) AS avg_val
          FROM jsonb_array_elements(COALESCE(s.criteria_template, '[]'::jsonb)) c
          LEFT JOIN scores sc2
            ON  sc2.semester_id = s.id
            AND sc2.criteria_scores IS NOT NULL
            AND sc2.final_submitted_at IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM juror_semester_auth a2
              WHERE a2.juror_id    = sc2.juror_id
                AND a2.semester_id = sc2.semester_id
                AND COALESCE(a2.edit_enabled, false) = false
            )
          GROUP BY c->>'key'
        ) sub
      )             AS criteria_avgs,
      COUNT(sc.juror_id) AS n_evals
    FROM semesters s
    LEFT JOIN scores sc
      ON  sc.semester_id = s.id
      AND sc.criteria_scores IS NOT NULL
      AND sc.final_submitted_at IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM juror_semester_auth a
        WHERE a.juror_id    = sc.juror_id
          AND a.semester_id = sc.semester_id
          AND COALESCE(a.edit_enabled, false) = false
      )
    WHERE (p_semester_ids IS NULL OR s.id = ANY(p_semester_ids))
    GROUP BY s.id, s.name, s.poster_date, s.criteria_template
    ORDER BY s.name;
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
    AND s.is_active = true;

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
  SELECT name       INTO v_sem_name   FROM semesters WHERE id = p_semester_id;
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
