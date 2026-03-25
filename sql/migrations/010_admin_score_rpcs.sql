-- ============================================================
-- 010_admin_score_rpcs.sql
-- Admin score, project summary, outcome trends, delete counts.
-- v1 (password) + v2 (JWT) variants. Canonical column names.
-- ============================================================

-- Auth helpers (_assert_tenant_admin, _assert_semester_access) are
-- defined in 003_auth_helpers.sql. Not redefined here.

-- Helper: status derivation used by both v1 and v2 score RPCs.
CREATE OR REPLACE FUNCTION public._derive_score_status(
  p_criteria jsonb, p_template jsonb, p_edit boolean, p_final timestamptz, p_comment text
) RETURNS text LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF p_criteria IS NOT NULL
     AND (p_template IS NULL OR jsonb_array_length(p_template) = 0
          OR (SELECT bool_and(p_criteria->>(t->>'key') IS NOT NULL) FROM jsonb_array_elements(p_template) t))
  THEN
    IF p_final IS NOT NULL THEN RETURN 'completed'; END IF;
    IF COALESCE(p_edit, false) THEN RETURN 'editing'; END IF;
    RETURN 'submitted';
  END IF;
  IF (p_criteria IS NULL OR p_criteria = '{}'::jsonb)
     AND NULLIF(trim(coalesce(p_comment, '')), '') IS NULL
  THEN RETURN 'not_started'; END IF;
  RETURN 'in_progress';
END; $$;

-- ═══════════ v2 (JWT) ═══════════════════════════════════════

CREATE OR REPLACE FUNCTION public.rpc_admin_scores_get(p_semester_id uuid)
RETURNS TABLE (
  juror_id uuid, juror_name text, juror_inst text, project_id uuid,
  group_no integer, project_title text, poster_date date, criteria_scores jsonb,
  total integer, comment text, updated_at timestamptz,
  final_submitted_at timestamptz, status text
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_tpl jsonb;
BEGIN
  PERFORM public._assert_semester_access(p_semester_id);
  SELECT criteria_template INTO v_tpl FROM semesters WHERE id = p_semester_id;
  RETURN QUERY
    SELECT j.id, j.juror_name, j.juror_inst, p.id, p.group_no, p.project_title,
      sc.poster_date, sc.criteria_scores, sc.total, sc.comment, sc.updated_at,
      sc.final_submitted_at,
      public._derive_score_status(sc.criteria_scores, v_tpl, a.edit_enabled, sc.final_submitted_at, sc.comment)
    FROM scores sc
    JOIN jurors j ON j.id = sc.juror_id
    JOIN projects p ON p.id = sc.project_id
    LEFT JOIN juror_semester_auth a ON a.juror_id = sc.juror_id AND a.semester_id = sc.semester_id
    WHERE sc.semester_id = p_semester_id
    ORDER BY j.juror_name, p.group_no;
END; $$;

-- Helper: criteria averages subquery (used by project_summary and outcome_trends).
-- Declared as a helper to avoid duplicating the correlated subquery.
CREATE OR REPLACE FUNCTION public._criteria_avgs_for_project(
  p_project_id uuid, p_semester_id uuid, p_template jsonb
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  RETURN (
    SELECT COALESCE(jsonb_object_agg(key, avg_val), '{}'::jsonb) FROM (
      SELECT c->>'key' AS key,
        ROUND(AVG((sc2.criteria_scores->>(c->>'key'))::numeric), 2) AS avg_val
      FROM jsonb_array_elements(COALESCE(p_template, '[]'::jsonb)) c
      LEFT JOIN scores sc2 ON sc2.project_id = p_project_id AND sc2.semester_id = p_semester_id
        AND sc2.criteria_scores IS NOT NULL AND sc2.final_submitted_at IS NOT NULL
        AND EXISTS (SELECT 1 FROM juror_semester_auth a2
          WHERE a2.juror_id = sc2.juror_id AND a2.semester_id = sc2.semester_id
            AND COALESCE(a2.edit_enabled, false) = false)
      GROUP BY c->>'key'
    ) sub
  );
END; $$;

CREATE OR REPLACE FUNCTION public.rpc_admin_project_summary(p_semester_id uuid)
RETURNS TABLE (
  project_id uuid, group_no integer, project_title text, group_students text,
  juror_count bigint, criteria_avgs jsonb, avg_total numeric,
  min_total integer, max_total integer, note text
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_tpl jsonb;
BEGIN
  PERFORM public._assert_semester_access(p_semester_id);
  SELECT criteria_template INTO v_tpl FROM semesters WHERE id = p_semester_id;
  RETURN QUERY
    SELECT p.id, p.group_no, p.project_title, p.group_students,
      COUNT(sc.juror_id),
      public._criteria_avgs_for_project(p.id, p_semester_id, v_tpl),
      ROUND(AVG(sc.total), 2), MIN(sc.total), MAX(sc.total), ''::text
    FROM projects p
    LEFT JOIN scores sc ON sc.project_id = p.id AND sc.semester_id = p_semester_id
      AND sc.criteria_scores IS NOT NULL AND sc.final_submitted_at IS NOT NULL
      AND EXISTS (SELECT 1 FROM juror_semester_auth a
        WHERE a.juror_id = sc.juror_id AND a.semester_id = sc.semester_id
          AND COALESCE(a.edit_enabled, false) = false)
    WHERE p.semester_id = p_semester_id
    GROUP BY p.id, p.group_no, p.project_title, p.group_students
    ORDER BY p.group_no;
END; $$;

CREATE OR REPLACE FUNCTION public.rpc_admin_outcome_trends(p_semester_ids uuid[])
RETURNS TABLE (
  semester_id uuid, semester_name text, poster_date date,
  criteria_avgs jsonb, n_evals bigint
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE = 'P0401'; END IF;
  IF NOT EXISTS (SELECT 1 FROM tenant_admin_memberships WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = 'P0401'; END IF;
  RETURN QUERY
    SELECT s.id, s.semester_name, s.poster_date,
      (SELECT COALESCE(jsonb_object_agg(key, avg_val), '{}'::jsonb) FROM (
        SELECT c->>'key' AS key,
          ROUND(AVG((sc2.criteria_scores->>(c->>'key'))::numeric), 2) AS avg_val
        FROM jsonb_array_elements(COALESCE(s.criteria_template, '[]'::jsonb)) c
        LEFT JOIN scores sc2 ON sc2.semester_id = s.id
          AND sc2.criteria_scores IS NOT NULL AND sc2.final_submitted_at IS NOT NULL
          AND EXISTS (SELECT 1 FROM juror_semester_auth a2
            WHERE a2.juror_id = sc2.juror_id AND a2.semester_id = sc2.semester_id
              AND COALESCE(a2.edit_enabled, false) = false)
        GROUP BY c->>'key') sub),
      COUNT(sc.juror_id)
    FROM semesters s
    LEFT JOIN scores sc ON sc.semester_id = s.id
      AND sc.criteria_scores IS NOT NULL AND sc.final_submitted_at IS NOT NULL
      AND EXISTS (SELECT 1 FROM juror_semester_auth a
        WHERE a.juror_id = sc.juror_id AND a.semester_id = sc.semester_id
          AND COALESCE(a.edit_enabled, false) = false)
    WHERE (p_semester_ids IS NULL OR s.id = ANY(p_semester_ids))
    GROUP BY s.id, s.semester_name, s.poster_date, s.criteria_template
    ORDER BY s.semester_name;
END; $$;

CREATE OR REPLACE FUNCTION public.rpc_admin_delete_counts(p_type text, p_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_p bigint:=0; v_s bigint:=0; v_ja bigint:=0; v_sem bigint:=0;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE = 'P0401'; END IF;
  IF NOT EXISTS (SELECT 1 FROM tenant_admin_memberships WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = 'P0401'; END IF;
  IF p_type = 'semester' THEN
    SELECT COUNT(*) INTO v_p FROM projects WHERE semester_id = p_id;
    SELECT COUNT(*) INTO v_s FROM scores WHERE semester_id = p_id
      AND (final_submitted_at IS NOT NULL OR (criteria_scores IS NOT NULL AND criteria_scores <> '{}'::jsonb));
    SELECT COUNT(*) INTO v_ja FROM juror_semester_auth WHERE semester_id = p_id;
    RETURN jsonb_build_object('projects', v_p, 'scores', v_s, 'juror_auths', v_ja);
  ELSIF p_type = 'project' THEN
    SELECT COUNT(*) INTO v_s FROM scores WHERE project_id = p_id
      AND (final_submitted_at IS NOT NULL OR (criteria_scores IS NOT NULL AND criteria_scores <> '{}'::jsonb));
    RETURN jsonb_build_object('scores', v_s);
  ELSIF p_type = 'juror' THEN
    SELECT COUNT(DISTINCT semester_id) INTO v_sem FROM scores WHERE juror_id = p_id AND final_submitted_at IS NOT NULL;
    SELECT COUNT(*) INTO v_s FROM scores WHERE juror_id = p_id AND final_submitted_at IS NOT NULL;
    SELECT COUNT(*) INTO v_ja FROM juror_semester_auth WHERE juror_id = p_id;
    RETURN jsonb_build_object('scores', v_s, 'juror_auths', v_ja, 'active_semesters', v_sem);
  ELSE RAISE EXCEPTION 'unsupported_type'; END IF;
END; $$;

-- ═══════════ v1 (password-based, legacy compat) ═════════════

DROP FUNCTION IF EXISTS public.rpc_admin_get_scores(uuid, text);
DROP FUNCTION IF EXISTS public.rpc_admin_get_scores(uuid, text, text);
CREATE OR REPLACE FUNCTION public.rpc_admin_get_scores(
  p_semester_id uuid, p_admin_password text, p_rpc_secret text DEFAULT ''
) RETURNS TABLE (
  juror_id uuid, juror_name text, juror_inst text, project_id uuid,
  group_no integer, project_title text, poster_date date, criteria_scores jsonb,
  total integer, comment text, updated_at timestamptz,
  final_submitted_at timestamptz, status text
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_tpl jsonb;
BEGIN
  IF NOT public._verify_admin_password(p_admin_password, p_rpc_secret) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = 'P0401'; END IF;
  SELECT criteria_template INTO v_tpl FROM semesters WHERE id = p_semester_id;
  RETURN QUERY
    SELECT j.id, j.juror_name, j.juror_inst, p.id, p.group_no, p.project_title,
      sc.poster_date, sc.criteria_scores, sc.total, sc.comment, sc.updated_at,
      sc.final_submitted_at,
      public._derive_score_status(sc.criteria_scores, v_tpl, a.edit_enabled, sc.final_submitted_at, sc.comment)
    FROM scores sc JOIN jurors j ON j.id = sc.juror_id JOIN projects p ON p.id = sc.project_id
    LEFT JOIN juror_semester_auth a ON a.juror_id = sc.juror_id AND a.semester_id = sc.semester_id
    WHERE sc.semester_id = p_semester_id ORDER BY j.juror_name, p.group_no;
END; $$;

DROP FUNCTION IF EXISTS public.rpc_admin_project_summary(uuid, text);
DROP FUNCTION IF EXISTS public.rpc_admin_project_summary(uuid, text, text);
CREATE OR REPLACE FUNCTION public.rpc_admin_project_summary(
  p_semester_id uuid, p_admin_password text, p_rpc_secret text DEFAULT ''
) RETURNS TABLE (
  project_id uuid, group_no integer, project_title text, group_students text,
  juror_count bigint, criteria_avgs jsonb, avg_total numeric,
  min_total integer, max_total integer, note text
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_tpl jsonb;
BEGIN
  IF NOT public._verify_admin_password(p_admin_password, p_rpc_secret) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = 'P0401'; END IF;
  SELECT criteria_template INTO v_tpl FROM semesters WHERE id = p_semester_id;
  RETURN QUERY
    SELECT p.id, p.group_no, p.project_title, p.group_students, COUNT(sc.juror_id),
      public._criteria_avgs_for_project(p.id, p_semester_id, v_tpl),
      ROUND(AVG(sc.total), 2), MIN(sc.total), MAX(sc.total), ''::text
    FROM projects p
    LEFT JOIN scores sc ON sc.project_id = p.id AND sc.semester_id = p_semester_id
      AND sc.criteria_scores IS NOT NULL AND sc.final_submitted_at IS NOT NULL
      AND EXISTS (SELECT 1 FROM juror_semester_auth a
        WHERE a.juror_id = sc.juror_id AND a.semester_id = sc.semester_id
          AND COALESCE(a.edit_enabled, false) = false)
    WHERE p.semester_id = p_semester_id
    GROUP BY p.id, p.group_no, p.project_title, p.group_students ORDER BY p.group_no;
END; $$;

DROP FUNCTION IF EXISTS public.rpc_admin_outcome_trends(uuid[], text);
DROP FUNCTION IF EXISTS public.rpc_admin_outcome_trends(uuid[], text, text);
CREATE OR REPLACE FUNCTION public.rpc_admin_outcome_trends(
  p_semester_ids uuid[], p_admin_password text, p_rpc_secret text DEFAULT ''
) RETURNS TABLE (
  semester_id uuid, semester_name text, poster_date date, criteria_avgs jsonb, n_evals bigint
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  IF NOT public._verify_admin_password(p_admin_password, p_rpc_secret) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = 'P0401'; END IF;
  RETURN QUERY
    SELECT s.id, s.semester_name, s.poster_date,
      (SELECT COALESCE(jsonb_object_agg(key, avg_val), '{}'::jsonb) FROM (
        SELECT c->>'key' AS key,
          ROUND(AVG((sc2.criteria_scores->>(c->>'key'))::numeric), 2) AS avg_val
        FROM jsonb_array_elements(COALESCE(s.criteria_template, '[]'::jsonb)) c
        LEFT JOIN scores sc2 ON sc2.semester_id = s.id
          AND sc2.criteria_scores IS NOT NULL AND sc2.final_submitted_at IS NOT NULL
          AND EXISTS (SELECT 1 FROM juror_semester_auth a2
            WHERE a2.juror_id = sc2.juror_id AND a2.semester_id = sc2.semester_id
              AND COALESCE(a2.edit_enabled, false) = false)
        GROUP BY c->>'key') sub),
      COUNT(sc.juror_id)
    FROM semesters s
    LEFT JOIN scores sc ON sc.semester_id = s.id
      AND sc.criteria_scores IS NOT NULL AND sc.final_submitted_at IS NOT NULL
      AND EXISTS (SELECT 1 FROM juror_semester_auth a
        WHERE a.juror_id = sc.juror_id AND a.semester_id = sc.semester_id
          AND COALESCE(a.edit_enabled, false) = false)
    WHERE (p_semester_ids IS NULL OR s.id = ANY(p_semester_ids))
    GROUP BY s.id, s.semester_name, s.poster_date, s.criteria_template
    ORDER BY s.semester_name;
END; $$;

DROP FUNCTION IF EXISTS public.rpc_admin_delete_counts(text, uuid, text);
DROP FUNCTION IF EXISTS public.rpc_admin_delete_counts(text, uuid, text, text);
CREATE OR REPLACE FUNCTION public.rpc_admin_delete_counts(
  p_type text, p_id uuid, p_admin_password text, p_rpc_secret text DEFAULT ''
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_p bigint:=0; v_s bigint:=0; v_ja bigint:=0; v_sem bigint:=0;
BEGIN
  IF NOT public._verify_admin_password(p_admin_password, p_rpc_secret) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = 'P0401'; END IF;
  IF p_type = 'semester' THEN
    SELECT COUNT(*) INTO v_p FROM projects WHERE semester_id = p_id;
    SELECT COUNT(*) INTO v_s FROM scores WHERE semester_id = p_id
      AND (final_submitted_at IS NOT NULL OR (criteria_scores IS NOT NULL AND criteria_scores <> '{}'::jsonb));
    SELECT COUNT(*) INTO v_ja FROM juror_semester_auth WHERE semester_id = p_id;
    RETURN jsonb_build_object('projects', v_p, 'scores', v_s, 'juror_auths', v_ja);
  ELSIF p_type = 'project' THEN
    SELECT COUNT(*) INTO v_s FROM scores WHERE project_id = p_id
      AND (final_submitted_at IS NOT NULL OR (criteria_scores IS NOT NULL AND criteria_scores <> '{}'::jsonb));
    RETURN jsonb_build_object('scores', v_s);
  ELSIF p_type = 'juror' THEN
    SELECT COUNT(DISTINCT semester_id) INTO v_sem FROM scores WHERE juror_id = p_id AND final_submitted_at IS NOT NULL;
    SELECT COUNT(*) INTO v_s FROM scores WHERE juror_id = p_id AND final_submitted_at IS NOT NULL;
    SELECT COUNT(*) INTO v_ja FROM juror_semester_auth WHERE juror_id = p_id;
    RETURN jsonb_build_object('scores', v_s, 'juror_auths', v_ja, 'active_semesters', v_sem);
  ELSE RAISE EXCEPTION 'unsupported_type'; END IF;
END; $$;
