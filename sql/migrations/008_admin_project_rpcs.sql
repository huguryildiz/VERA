-- ============================================================
-- 008_admin_project_rpcs.sql
-- Admin project RPCs — v1 (password) and v2 (JWT).
-- Canonical: semester_name, is_current, projects.tenant_id,
-- scores.tenant_id — all INSERTs look up tenant_id from semesters.
-- ============================================================

-- ══════════════════════════════════════════════════════════════
-- v2 RPCs (JWT-based)
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.rpc_admin_project_list(p_semester_id uuid)
RETURNS TABLE (id uuid, semester_id uuid, group_no integer, project_title text, group_students text, updated_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
#variable_conflict use_column
BEGIN
  PERFORM public._assert_semester_access(p_semester_id);
  RETURN QUERY SELECT p.id, p.semester_id, p.group_no, p.project_title, p.group_students, p.updated_at
    FROM projects p WHERE p.semester_id = p_semester_id ORDER BY p.group_no ASC;
END; $$;

CREATE OR REPLACE FUNCTION public.rpc_admin_project_create(p_semester_id uuid, p_group_no integer, p_project_title text, p_group_students text)
RETURNS TABLE (project_id uuid) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_uid uuid; v_id uuid; v_tid uuid; v_sn text; v_lk boolean := false;
BEGIN
  v_uid := public._assert_semester_access(p_semester_id);
  SELECT tenant_id, semester_name, COALESCE(is_locked,false) INTO v_tid, v_sn, v_lk FROM semesters WHERE id = p_semester_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'semester_not_found'; END IF;
  IF v_lk THEN RAISE EXCEPTION 'semester_locked'; END IF;
  IF EXISTS (SELECT 1 FROM projects WHERE semester_id = p_semester_id AND group_no = p_group_no) THEN RAISE EXCEPTION 'project_group_exists'; END IF;
  INSERT INTO projects (semester_id, tenant_id, group_no, project_title, group_students)
  VALUES (p_semester_id, v_tid, p_group_no, p_project_title, p_group_students) RETURNING id INTO v_id;
  INSERT INTO scores (semester_id, tenant_id, project_id, juror_id, poster_date)
  SELECT jsa.semester_id, v_tid, v_id, jsa.juror_id, sem.poster_date
  FROM juror_semester_auth jsa JOIN semesters sem ON sem.id = jsa.semester_id WHERE jsa.semester_id = p_semester_id
  ON CONFLICT ON CONSTRAINT scores_unique_eval DO NOTHING;
  PERFORM public._audit_log('admin', v_uid, 'project_create', 'project', v_id,
    format('Admin created project Group %s — %s (%s).', p_group_no, p_project_title, COALESCE(v_sn, p_semester_id::text)),
    jsonb_build_object('semester_id', p_semester_id, 'group_no', p_group_no, 'semester_name', v_sn));
  RETURN QUERY SELECT v_id;
END; $$;

CREATE OR REPLACE FUNCTION public.rpc_admin_project_upsert(p_semester_id uuid, p_group_no integer, p_project_title text, p_group_students text)
RETURNS TABLE (project_id uuid) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_uid uuid; v_id uuid; v_tid uuid; v_cr boolean := false; v_act text; v_msg text; v_sn text; v_lk boolean := false;
BEGIN
  v_uid := public._assert_semester_access(p_semester_id);
  SELECT tenant_id, semester_name, COALESCE(is_locked,false) INTO v_tid, v_sn, v_lk FROM semesters WHERE id = p_semester_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'semester_not_found'; END IF;
  IF v_lk THEN RAISE EXCEPTION 'semester_locked'; END IF;
  SELECT id INTO v_id FROM projects WHERE semester_id = p_semester_id AND group_no = p_group_no LIMIT 1;
  IF v_id IS NULL THEN
    INSERT INTO projects (semester_id, tenant_id, group_no, project_title, group_students)
    VALUES (p_semester_id, v_tid, p_group_no, p_project_title, p_group_students) RETURNING id INTO v_id;
    v_cr := true;
  ELSE
    UPDATE projects SET project_title = p_project_title, group_students = p_group_students WHERE id = v_id;
  END IF;
  v_act := CASE WHEN v_cr THEN 'project_create' ELSE 'project_update' END;
  v_msg := format('Admin %s project Group %s — %s (%s).', CASE WHEN v_cr THEN 'created' ELSE 'updated' END, p_group_no, p_project_title, COALESCE(v_sn, p_semester_id::text));
  PERFORM public._audit_log('admin', v_uid, v_act, 'project', v_id, v_msg,
    jsonb_build_object('semester_id', p_semester_id, 'group_no', p_group_no, 'semester_name', v_sn));
  RETURN QUERY SELECT v_id;
END; $$;

CREATE OR REPLACE FUNCTION public.rpc_admin_project_delete(p_project_id uuid, p_delete_password text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_uid uuid; v_title text; v_grp integer; v_sid uuid; v_lk boolean := false; v_hs boolean := false;
BEGIN
  SELECT project_title, group_no, semester_id INTO v_title, v_grp, v_sid FROM projects WHERE id = p_project_id;
  IF v_sid IS NULL THEN RAISE EXCEPTION 'project_not_found'; END IF;
  v_uid := public._assert_semester_access(v_sid);
  PERFORM public._assert_delete_password(p_delete_password);
  SELECT COALESCE(is_locked,false) INTO v_lk FROM semesters WHERE id = v_sid;
  IF v_lk THEN RAISE EXCEPTION 'semester_locked'; END IF;
  SELECT EXISTS (SELECT 1 FROM scores s WHERE s.project_id = p_project_id
    AND (s.final_submitted_at IS NOT NULL OR (s.criteria_scores IS NOT NULL AND s.criteria_scores <> '{}'::jsonb))) INTO v_hs;
  IF v_hs THEN RAISE EXCEPTION 'project_has_scored_data'; END IF;
  DELETE FROM projects WHERE id = p_project_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'project_not_found'; END IF;
  PERFORM public._audit_log('admin', v_uid, 'project_delete', 'project', p_project_id,
    format('Admin deleted project Group %s — %s.', COALESCE(v_grp::text,'?'), COALESCE(v_title, p_project_id::text)),
    jsonb_build_object('group_no', v_grp, 'semester_id', v_sid));
  RETURN true;
END; $$;

CREATE OR REPLACE FUNCTION public.rpc_admin_project_summary(p_semester_id uuid)
RETURNS TABLE (project_id uuid, group_no integer, project_title text, group_students text, juror_count bigint, criteria_avgs jsonb, avg_total numeric, min_total integer, max_total integer, note text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_uid uuid; v_tmpl jsonb;
BEGIN
  v_uid := public._assert_semester_access(p_semester_id);
  SELECT criteria_template INTO v_tmpl FROM semesters WHERE id = p_semester_id;
  RETURN QUERY
    SELECT p.id AS project_id, p.group_no, p.project_title, p.group_students, COUNT(s.juror_id) AS juror_count,
      (SELECT COALESCE(jsonb_object_agg(key, avg_val),'{}'::jsonb) FROM (
        SELECT c->>'key' AS key, ROUND(AVG((s2.criteria_scores->>(c->>'key'))::numeric),2) AS avg_val
        FROM jsonb_array_elements(COALESCE(v_tmpl,'[]'::jsonb)) c
        LEFT JOIN scores s2 ON s2.project_id = p.id AND s2.semester_id = p_semester_id AND s2.criteria_scores IS NOT NULL AND s2.final_submitted_at IS NOT NULL
          AND EXISTS (SELECT 1 FROM juror_semester_auth a2 WHERE a2.juror_id = s2.juror_id AND a2.semester_id = s2.semester_id AND COALESCE(a2.edit_enabled,false) = false)
        GROUP BY c->>'key') sub) AS criteria_avgs,
      ROUND(AVG(s.total),2) AS avg_total, MIN(s.total) AS min_total, MAX(s.total) AS max_total, ''::text AS note
    FROM projects p
    LEFT JOIN scores s ON s.project_id = p.id AND s.semester_id = p_semester_id AND s.criteria_scores IS NOT NULL AND s.final_submitted_at IS NOT NULL
      AND EXISTS (SELECT 1 FROM juror_semester_auth a WHERE a.juror_id = s.juror_id AND a.semester_id = s.semester_id AND COALESCE(a.edit_enabled,false) = false)
    WHERE p.semester_id = p_semester_id
    GROUP BY p.id, p.group_no, p.project_title, p.group_students ORDER BY p.group_no;
END; $$;

-- ══════════════════════════════════════════════════════════════
-- v1 RPCs (password-based — legacy)
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.rpc_admin_list_projects(p_semester_id uuid, p_admin_password text, p_rpc_secret text DEFAULT '')
RETURNS TABLE (id uuid, semester_id uuid, group_no integer, project_title text, group_students text, updated_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
#variable_conflict use_column
BEGIN
  IF NOT public._verify_admin_password(p_admin_password, p_rpc_secret) THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE = 'P0401'; END IF;
  RETURN QUERY SELECT p.id, p.semester_id, p.group_no, p.project_title, p.group_students, p.updated_at
    FROM projects p WHERE p.semester_id = p_semester_id ORDER BY p.group_no ASC;
END; $$;

CREATE OR REPLACE FUNCTION public.rpc_admin_create_project(p_semester_id uuid, p_group_no integer, p_project_title text, p_group_students text, p_admin_password text, p_rpc_secret text DEFAULT '')
RETURNS TABLE (project_id uuid) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_id uuid; v_tid uuid; v_sn text; v_lk boolean := false;
BEGIN
  IF NOT public._verify_admin_password(p_admin_password, p_rpc_secret) THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE = 'P0401'; END IF;
  SELECT semester_name, COALESCE(is_locked,false), tenant_id INTO v_sn, v_lk, v_tid FROM semesters WHERE id = p_semester_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'semester_not_found'; END IF;
  IF v_lk THEN RAISE EXCEPTION 'semester_locked'; END IF;
  IF EXISTS (SELECT 1 FROM projects WHERE semester_id = p_semester_id AND group_no = p_group_no) THEN RAISE EXCEPTION 'project_group_exists'; END IF;
  INSERT INTO projects (semester_id, tenant_id, group_no, project_title, group_students)
  VALUES (p_semester_id, v_tid, p_group_no, p_project_title, p_group_students) RETURNING id INTO v_id;
  INSERT INTO scores (semester_id, tenant_id, project_id, juror_id, poster_date)
  SELECT jsa.semester_id, v_tid, v_id, jsa.juror_id, sem.poster_date
  FROM juror_semester_auth jsa JOIN semesters sem ON sem.id = jsa.semester_id WHERE jsa.semester_id = p_semester_id
  ON CONFLICT ON CONSTRAINT scores_unique_eval DO NOTHING;
  PERFORM public._audit_log('admin', null::uuid, 'project_create', 'project', v_id,
    format('Admin created project Group %s — %s (%s).', p_group_no, p_project_title, COALESCE(v_sn, p_semester_id::text)),
    jsonb_build_object('semester_id', p_semester_id, 'group_no', p_group_no, 'semester_name', v_sn));
  RETURN QUERY SELECT v_id;
END; $$;

CREATE OR REPLACE FUNCTION public.rpc_admin_upsert_project(p_semester_id uuid, p_group_no integer, p_project_title text, p_group_students text, p_admin_password text, p_rpc_secret text DEFAULT '')
RETURNS TABLE (project_id uuid) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_id uuid; v_tid uuid; v_cr boolean := false; v_act text; v_msg text; v_sn text; v_lk boolean := false;
BEGIN
  IF NOT public._verify_admin_password(p_admin_password, p_rpc_secret) THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE = 'P0401'; END IF;
  SELECT semester_name, COALESCE(is_locked,false), tenant_id INTO v_sn, v_lk, v_tid FROM semesters WHERE id = p_semester_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'semester_not_found'; END IF;
  IF v_lk THEN RAISE EXCEPTION 'semester_locked'; END IF;
  SELECT id INTO v_id FROM projects WHERE semester_id = p_semester_id AND group_no = p_group_no LIMIT 1;
  IF v_id IS NULL THEN
    INSERT INTO projects (semester_id, tenant_id, group_no, project_title, group_students)
    VALUES (p_semester_id, v_tid, p_group_no, p_project_title, p_group_students) RETURNING id INTO v_id;
    v_cr := true;
  ELSE
    UPDATE projects SET project_title = p_project_title, group_students = p_group_students WHERE id = v_id;
  END IF;
  v_act := CASE WHEN v_cr THEN 'project_create' ELSE 'project_update' END;
  v_msg := format('Admin %s project Group %s — %s (%s).', CASE WHEN v_cr THEN 'created' ELSE 'updated' END, p_group_no, p_project_title, COALESCE(v_sn, p_semester_id::text));
  PERFORM public._audit_log('admin', null::uuid, v_act, 'project', v_id, v_msg,
    jsonb_build_object('semester_id', p_semester_id, 'group_no', p_group_no, 'semester_name', v_sn));
  RETURN QUERY SELECT v_id;
END; $$;

CREATE OR REPLACE FUNCTION public.rpc_admin_delete_project(p_project_id uuid, p_delete_password text, p_rpc_secret text DEFAULT '')
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_title text; v_grp integer; v_sid uuid; v_lk boolean := false; v_hs boolean := false;
BEGIN
  PERFORM public._verify_rpc_secret(p_rpc_secret);
  PERFORM public._assert_delete_password(p_delete_password);
  SELECT project_title, group_no, semester_id INTO v_title, v_grp, v_sid FROM projects WHERE id = p_project_id;
  IF v_sid IS NULL THEN RAISE EXCEPTION 'project_not_found'; END IF;
  SELECT COALESCE(is_locked,false) INTO v_lk FROM semesters WHERE id = v_sid;
  IF v_lk THEN RAISE EXCEPTION 'semester_locked'; END IF;
  SELECT EXISTS (SELECT 1 FROM scores s WHERE s.project_id = p_project_id
    AND (s.final_submitted_at IS NOT NULL OR (s.criteria_scores IS NOT NULL AND s.criteria_scores <> '{}'::jsonb))) INTO v_hs;
  IF v_hs THEN RAISE EXCEPTION 'project_has_scored_data'; END IF;
  DELETE FROM projects WHERE id = p_project_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'project_not_found'; END IF;
  PERFORM public._audit_log('admin', null::uuid, 'project_delete', 'project', p_project_id,
    format('Admin deleted project Group %s — %s.', COALESCE(v_grp::text,'?'), COALESCE(v_title, p_project_id::text)),
    jsonb_build_object('group_no', v_grp, 'semester_id', v_sid));
  RETURN true;
END; $$;

CREATE OR REPLACE FUNCTION public.rpc_admin_project_summary(p_semester_id uuid, p_admin_password text, p_rpc_secret text DEFAULT '')
RETURNS TABLE (project_id uuid, group_no integer, project_title text, group_students text, juror_count bigint, criteria_avgs jsonb, avg_total numeric, min_total integer, max_total integer, note text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_tmpl jsonb;
BEGIN
  IF NOT public._verify_admin_password(p_admin_password, p_rpc_secret) THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE = 'P0401'; END IF;
  SELECT criteria_template INTO v_tmpl FROM semesters WHERE id = p_semester_id;
  RETURN QUERY
    SELECT p.id AS project_id, p.group_no, p.project_title, p.group_students, COUNT(s.juror_id) AS juror_count,
      (SELECT COALESCE(jsonb_object_agg(key, avg_val),'{}'::jsonb) FROM (
        SELECT c->>'key' AS key, ROUND(AVG((s2.criteria_scores->>(c->>'key'))::numeric),2) AS avg_val
        FROM jsonb_array_elements(COALESCE(v_tmpl,'[]'::jsonb)) c
        LEFT JOIN scores s2 ON s2.project_id = p.id AND s2.semester_id = p_semester_id AND s2.criteria_scores IS NOT NULL AND s2.final_submitted_at IS NOT NULL
          AND EXISTS (SELECT 1 FROM juror_semester_auth a2 WHERE a2.juror_id = s2.juror_id AND a2.semester_id = s2.semester_id AND COALESCE(a2.edit_enabled,false) = false)
        GROUP BY c->>'key') sub) AS criteria_avgs,
      ROUND(AVG(s.total),2) AS avg_total, MIN(s.total) AS min_total, MAX(s.total) AS max_total, ''::text AS note
    FROM projects p
    LEFT JOIN scores s ON s.project_id = p.id AND s.semester_id = p_semester_id AND s.criteria_scores IS NOT NULL AND s.final_submitted_at IS NOT NULL
      AND EXISTS (SELECT 1 FROM juror_semester_auth a WHERE a.juror_id = s.juror_id AND a.semester_id = s.semester_id AND COALESCE(a.edit_enabled,false) = false)
    WHERE p.semester_id = p_semester_id
    GROUP BY p.id, p.group_no, p.project_title, p.group_students ORDER BY p.group_no;
END; $$;

-- ── Grants ──────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.rpc_admin_project_list(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_project_create(uuid, integer, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_project_upsert(uuid, integer, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_project_delete(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_project_summary(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_list_projects(uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_create_project(uuid, integer, text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_upsert_project(uuid, integer, text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_delete_project(uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_project_summary(uuid, text, text) TO anon, authenticated;
