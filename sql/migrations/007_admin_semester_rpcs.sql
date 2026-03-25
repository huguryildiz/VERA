-- ============================================================
-- 007_admin_semester_rpcs.sql
-- Admin semester RPCs — v1 (password) and v2 (JWT).
-- Canonical: semester_name (was name), is_current (was is_active),
-- p_semester_name (was p_name), set_current_semester (was set_active_semester).
-- ============================================================

-- ══════════════════════════════════════════════════════════════
-- v2 RPCs (JWT-based)
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.rpc_admin_semester_list(p_tenant_id uuid)
RETURNS TABLE (id uuid, semester_name text, is_current boolean, is_locked boolean, poster_date date, updated_at timestamptz, criteria_template jsonb, mudek_template jsonb)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  PERFORM public._assert_tenant_admin(p_tenant_id);
  RETURN QUERY SELECT s.id, s.semester_name, s.is_current, s.is_locked, s.poster_date, s.updated_at, s.criteria_template, s.mudek_template
    FROM semesters s WHERE s.tenant_id = p_tenant_id ORDER BY s.poster_date DESC NULLS LAST;
END; $$;

CREATE OR REPLACE FUNCTION public.rpc_admin_semester_create(
  p_tenant_id uuid, p_semester_name text, p_poster_date date DEFAULT NULL,
  p_criteria_template jsonb DEFAULT NULL, p_mudek_template jsonb DEFAULT NULL
) RETURNS TABLE (id uuid, semester_name text, is_current boolean, poster_date date, criteria_template jsonb, mudek_template jsonb)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
#variable_conflict use_column
DECLARE v_uid uuid; v_id uuid; v_sn text; v_cur boolean; v_pd date; v_ct jsonb; v_mt jsonb;
BEGIN
  v_uid := public._assert_tenant_admin(p_tenant_id);
  v_sn := trim(p_semester_name);
  IF v_sn IS NULL OR v_sn = '' THEN RAISE EXCEPTION 'semester_name_required'; END IF;
  IF EXISTS (SELECT 1 FROM semesters s WHERE s.tenant_id = p_tenant_id AND lower(trim(s.semester_name)) = lower(v_sn)) THEN
    RAISE EXCEPTION 'semester_name_exists'; END IF;
  INSERT INTO semesters (tenant_id, semester_name, is_current, poster_date, criteria_template, mudek_template)
  VALUES (p_tenant_id, v_sn, false, p_poster_date, COALESCE(p_criteria_template,'[]'::jsonb), COALESCE(p_mudek_template,'[]'::jsonb))
  RETURNING semesters.id, semesters.semester_name, semesters.is_current, semesters.poster_date, semesters.criteria_template, semesters.mudek_template
    INTO v_id, v_sn, v_cur, v_pd, v_ct, v_mt;
  PERFORM public._audit_log('admin', v_uid, 'semester_create', 'semester', v_id,
    format('Admin created semester %s.', v_sn), jsonb_build_object('poster_date', v_pd, 'tenant_id', p_tenant_id));
  RETURN QUERY SELECT v_id, v_sn, v_cur, v_pd, v_ct, v_mt;
END; $$;

CREATE OR REPLACE FUNCTION public.rpc_admin_semester_update(
  p_semester_id uuid, p_semester_name text, p_poster_date date DEFAULT NULL,
  p_criteria_template jsonb DEFAULT NULL, p_mudek_template jsonb DEFAULT NULL
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_uid uuid; v_name text; v_tid uuid; v_hs boolean := false;
BEGIN
  v_uid := public._assert_semester_access(p_semester_id);
  SELECT tenant_id INTO v_tid FROM semesters WHERE id = p_semester_id;
  v_name := trim(p_semester_name);
  IF v_name IS NULL OR v_name = '' THEN RAISE EXCEPTION 'semester_name_required'; END IF;
  IF EXISTS (SELECT 1 FROM semesters s WHERE s.tenant_id = v_tid AND lower(trim(s.semester_name)) = lower(v_name) AND s.id <> p_semester_id) THEN
    RAISE EXCEPTION 'semester_name_exists'; END IF;
  IF p_criteria_template IS NOT NULL OR p_mudek_template IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM semesters WHERE id = p_semester_id AND is_locked = TRUE) THEN RAISE EXCEPTION 'semester_template_locked_by_scores'; END IF;
    SELECT EXISTS (SELECT 1 FROM scores sc WHERE sc.semester_id = p_semester_id
      AND (sc.final_submitted_at IS NOT NULL OR (sc.criteria_scores IS NOT NULL AND sc.criteria_scores <> '{}'::jsonb))) INTO v_hs;
    IF v_hs THEN RAISE EXCEPTION 'semester_template_locked_by_scores'; END IF;
  END IF;
  UPDATE semesters SET semester_name = v_name, poster_date = p_poster_date,
    criteria_template = COALESCE(p_criteria_template, criteria_template), mudek_template = COALESCE(p_mudek_template, mudek_template)
  WHERE id = p_semester_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'semester_not_found'; END IF;
  PERFORM public._audit_log('admin', v_uid, 'semester_update', 'semester', p_semester_id, format('Admin updated semester %s.', v_name), NULL);
  RETURN true;
END; $$;

CREATE OR REPLACE FUNCTION public.rpc_admin_semester_delete(p_semester_id uuid, p_delete_password text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_uid uuid; v_name text;
BEGIN
  v_uid := public._assert_semester_access(p_semester_id);
  PERFORM public._assert_delete_password(p_delete_password);
  SELECT semester_name INTO v_name FROM semesters WHERE id = p_semester_id;
  DELETE FROM semesters WHERE id = p_semester_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'semester_not_found'; END IF;
  PERFORM public._audit_log('admin', v_uid, 'semester_delete', 'semester', p_semester_id,
    format('Admin deleted semester %s.', COALESCE(v_name, p_semester_id::text)), NULL);
  RETURN true;
END; $$;

CREATE OR REPLACE FUNCTION public.rpc_admin_semester_set_current(p_semester_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_uid uuid; v_name text; v_tid uuid;
BEGIN
  v_uid := public._assert_semester_access(p_semester_id);
  SELECT semester_name, tenant_id INTO v_name, v_tid FROM semesters WHERE id = p_semester_id;
  IF v_name IS NULL THEN RAISE EXCEPTION 'semester_not_found'; END IF;
  UPDATE semesters SET is_current = false WHERE tenant_id = v_tid AND id <> p_semester_id;
  UPDATE semesters SET is_current = true WHERE id = p_semester_id;
  PERFORM public._audit_log('admin', v_uid, 'set_current_semester', 'semester', p_semester_id,
    format('Admin set current semester to %s.', COALESCE(v_name, p_semester_id::text)), NULL);
  RETURN true;
END; $$;

CREATE OR REPLACE FUNCTION public.rpc_admin_semester_set_eval_lock(p_semester_id uuid, p_enabled boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_uid uuid; v_sn text; v_en boolean := COALESCE(p_enabled, false);
BEGIN
  v_uid := public._assert_semester_access(p_semester_id);
  UPDATE semesters s SET is_locked = v_en, updated_at = now() WHERE s.id = p_semester_id RETURNING s.semester_name INTO v_sn;
  IF NOT FOUND THEN RAISE EXCEPTION 'semester_not_found'; END IF;
  PERFORM public._audit_log('admin', v_uid, 'eval_lock_toggle', 'semester', p_semester_id,
    format('Admin turned evaluation lock %s (%s).', CASE WHEN v_en THEN 'ON' ELSE 'OFF' END, COALESCE(v_sn, p_semester_id::text)),
    jsonb_build_object('semester_id', p_semester_id, 'semester_name', v_sn, 'enabled', v_en));
  RETURN true;
END; $$;

-- ══════════════════════════════════════════════════════════════
-- v1 RPCs (password-based — legacy)
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.rpc_admin_set_current_semester(p_semester_id uuid, p_admin_password text, p_rpc_secret text DEFAULT '')
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_name text;
BEGIN
  IF NOT public._verify_admin_password(p_admin_password, p_rpc_secret) THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE = 'P0401'; END IF;
  SELECT semester_name INTO v_name FROM semesters WHERE id = p_semester_id;
  IF v_name IS NULL THEN RAISE EXCEPTION 'semester_not_found'; END IF;
  UPDATE semesters SET is_current = false WHERE id <> p_semester_id;
  UPDATE semesters SET is_current = true WHERE id = p_semester_id;
  PERFORM public._audit_log('admin', null::uuid, 'set_current_semester', 'semester', p_semester_id,
    format('Admin set current semester to %s.', COALESCE(v_name, p_semester_id::text)), NULL);
  RETURN true;
END; $$;

CREATE OR REPLACE FUNCTION public.rpc_admin_create_semester(
  p_semester_name text, p_poster_date date, p_criteria_template jsonb DEFAULT NULL,
  p_mudek_template jsonb DEFAULT NULL, p_admin_password text DEFAULT '', p_rpc_secret text DEFAULT ''
) RETURNS TABLE (id uuid, semester_name text, is_current boolean, poster_date date, criteria_template jsonb, mudek_template jsonb)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
#variable_conflict use_column
DECLARE v_id uuid; v_sn text; v_cur boolean; v_pd date; v_ct jsonb; v_mt jsonb;
BEGIN
  IF NOT public._verify_admin_password(p_admin_password, p_rpc_secret) THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE = 'P0401'; END IF;
  v_sn := trim(p_semester_name);
  IF v_sn IS NULL OR v_sn = '' THEN RAISE EXCEPTION 'semester_name_required'; END IF;
  IF EXISTS (SELECT 1 FROM semesters s WHERE lower(trim(s.semester_name)) = lower(v_sn)) THEN RAISE EXCEPTION 'semester_name_exists'; END IF;
  INSERT INTO semesters (semester_name, is_current, poster_date, criteria_template, mudek_template)
  VALUES (v_sn, false, p_poster_date, COALESCE(p_criteria_template,'[]'::jsonb), COALESCE(p_mudek_template,'[]'::jsonb))
  RETURNING semesters.id, semesters.semester_name, semesters.is_current, semesters.poster_date, semesters.criteria_template, semesters.mudek_template
    INTO v_id, v_sn, v_cur, v_pd, v_ct, v_mt;
  PERFORM public._audit_log('admin', null::uuid, 'semester_create', 'semester', v_id,
    format('Admin created semester %s.', v_sn), jsonb_build_object('poster_date', v_pd));
  RETURN QUERY SELECT v_id, v_sn, v_cur, v_pd, v_ct, v_mt;
END; $$;

CREATE OR REPLACE FUNCTION public.rpc_admin_update_semester(
  p_semester_id uuid, p_semester_name text, p_poster_date date,
  p_criteria_template jsonb DEFAULT NULL, p_mudek_template jsonb DEFAULT NULL,
  p_admin_password text DEFAULT '', p_rpc_secret text DEFAULT ''
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_name text; v_hs boolean := false;
BEGIN
  IF NOT public._verify_admin_password(p_admin_password, p_rpc_secret) THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE = 'P0401'; END IF;
  v_name := trim(p_semester_name);
  IF v_name IS NULL OR v_name = '' THEN RAISE EXCEPTION 'semester_name_required'; END IF;
  IF EXISTS (SELECT 1 FROM semesters s WHERE lower(trim(s.semester_name)) = lower(v_name) AND s.id <> p_semester_id) THEN
    RAISE EXCEPTION 'semester_name_exists'; END IF;
  IF p_criteria_template IS NOT NULL OR p_mudek_template IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM semesters WHERE id = p_semester_id AND is_locked = TRUE) THEN RAISE EXCEPTION 'semester_template_locked_by_scores'; END IF;
    SELECT EXISTS (SELECT 1 FROM scores sc WHERE sc.semester_id = p_semester_id
      AND (sc.final_submitted_at IS NOT NULL OR (sc.criteria_scores IS NOT NULL AND sc.criteria_scores <> '{}'::jsonb))) INTO v_hs;
    IF v_hs THEN RAISE EXCEPTION 'semester_template_locked_by_scores'; END IF;
  END IF;
  UPDATE semesters SET semester_name = v_name, poster_date = p_poster_date,
    criteria_template = COALESCE(p_criteria_template, criteria_template), mudek_template = COALESCE(p_mudek_template, mudek_template)
  WHERE id = p_semester_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'semester_not_found'; END IF;
  PERFORM public._audit_log('admin', null::uuid, 'semester_update', 'semester', p_semester_id, format('Admin updated semester %s.', v_name), NULL);
  RETURN true;
END; $$;

CREATE OR REPLACE FUNCTION public.rpc_admin_delete_semester(p_semester_id uuid, p_delete_password text, p_rpc_secret text DEFAULT '')
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_name text;
BEGIN
  PERFORM public._verify_rpc_secret(p_rpc_secret);
  PERFORM public._assert_delete_password(p_delete_password);
  SELECT semester_name INTO v_name FROM semesters WHERE id = p_semester_id;
  DELETE FROM semesters WHERE id = p_semester_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'semester_not_found'; END IF;
  PERFORM public._audit_log('admin', null::uuid, 'semester_delete', 'semester', p_semester_id,
    format('Admin deleted semester %s.', COALESCE(v_name, p_semester_id::text)), NULL);
  RETURN true;
END; $$;

CREATE OR REPLACE FUNCTION public.rpc_admin_set_semester_eval_lock(p_semester_id uuid, p_enabled boolean, p_admin_password text, p_rpc_secret text DEFAULT '')
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_sn text; v_en boolean := COALESCE(p_enabled, false);
BEGIN
  IF NOT public._verify_admin_password(p_admin_password, p_rpc_secret) THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE = 'P0401'; END IF;
  UPDATE semesters s SET is_locked = v_en, updated_at = now() WHERE s.id = p_semester_id RETURNING s.semester_name INTO v_sn;
  IF NOT FOUND THEN RAISE EXCEPTION 'semester_not_found'; END IF;
  PERFORM public._audit_log('admin', null::uuid, 'eval_lock_toggle', 'semester', p_semester_id,
    format('Admin turned evaluation lock %s (%s).', CASE WHEN v_en THEN 'ON' ELSE 'OFF' END, COALESCE(v_sn, p_semester_id::text)),
    jsonb_build_object('semester_id', p_semester_id, 'semester_name', v_sn, 'enabled', v_en));
  RETURN true;
END; $$;

-- ── Grants ──────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.rpc_admin_semester_list(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_semester_create(uuid, text, date, jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_semester_update(uuid, text, date, jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_semester_delete(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_semester_set_current(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_semester_set_eval_lock(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_set_current_semester(uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_create_semester(text, date, jsonb, jsonb, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_update_semester(uuid, text, date, jsonb, jsonb, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_delete_semester(uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_set_semester_eval_lock(uuid, boolean, text, text) TO anon, authenticated;
