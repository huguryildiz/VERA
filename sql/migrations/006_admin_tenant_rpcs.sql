-- ============================================================
-- 006_admin_tenant_rpcs.sql
-- v2 JWT-based tenant management, session, onboarding, and
-- admin profile RPCs.  Canonical column names:
--   tenants.short_label (was name), semesters.semester_name,
--   semesters.is_current (was is_active).
-- ============================================================

-- Auth helpers (_get_auth_user_id, _assert_super_admin, _assert_tenant_admin,
-- _assert_semester_access) are defined in 003_auth_helpers.sql.

-- ── Session ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.rpc_admin_auth_get_session()
RETURNS TABLE (user_id uuid, user_email text, tenant_id uuid, tenant_code text, tenant_short_label text, role text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_uid uuid; v_is_super boolean; v_email text;
BEGIN
  v_uid := public._get_auth_user_id();
  SELECT u.email INTO v_email FROM auth.users u WHERE u.id = v_uid;

  SELECT EXISTS (
    SELECT 1 FROM tenant_admin_memberships tam
    WHERE tam.user_id = v_uid AND tam.role = 'super_admin' AND tam.tenant_id IS NULL
  ) INTO v_is_super;

  IF v_is_super THEN
    RETURN QUERY SELECT v_uid, v_email::text, NULL::uuid, NULL::text, NULL::text, 'super_admin'::text;
    RETURN QUERY SELECT v_uid, v_email::text, t.id, t.code, t.short_label, 'super_admin'::text
      FROM tenants t WHERE t.status = 'active' ORDER BY t.code;
  ELSE
    RETURN QUERY SELECT tam.user_id, v_email::text, tam.tenant_id, t.code, t.short_label, tam.role
      FROM tenant_admin_memberships tam
      LEFT JOIN tenants t ON t.id = tam.tenant_id
      WHERE tam.user_id = v_uid;
  END IF;
END; $$;

-- ── Tenant CRUD (super-admin) ───────────────────────────────
CREATE OR REPLACE FUNCTION public.rpc_admin_tenant_list()
RETURNS TABLE (id uuid, code text, short_label text, university text, department text, status text, created_at timestamptz, updated_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  PERFORM public._assert_super_admin();
  RETURN QUERY SELECT t.id, t.code, t.short_label, t.university, t.department, t.status, t.created_at, t.updated_at FROM tenants t ORDER BY t.code;
END; $$;

CREATE OR REPLACE FUNCTION public.rpc_admin_tenant_create(p_code text, p_short_label text, p_university text DEFAULT '', p_department text DEFAULT '')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_uid uuid; v_id uuid;
BEGIN
  v_uid := public._assert_super_admin();
  INSERT INTO tenants (code, short_label, university, department)
  VALUES (trim(p_code), trim(p_short_label), COALESCE(trim(p_university),''), COALESCE(trim(p_department),''))
  RETURNING id INTO v_id;
  PERFORM public._audit_log('admin', v_uid, 'tenant_create', 'tenant', v_id,
    format('Created tenant %s (%s).', trim(p_short_label), trim(p_code)), jsonb_build_object('code', trim(p_code)));
  RETURN v_id;
END; $$;

CREATE OR REPLACE FUNCTION public.rpc_admin_tenant_update(p_tenant_id uuid, p_short_label text DEFAULT NULL, p_university text DEFAULT NULL, p_department text DEFAULT NULL, p_status text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_uid uuid;
BEGIN
  v_uid := public._assert_super_admin();
  UPDATE tenants SET short_label = COALESCE(NULLIF(trim(p_short_label),''), short_label),
    university = COALESCE(p_university, university), department = COALESCE(p_department, department),
    status = COALESCE(NULLIF(trim(p_status),''), status) WHERE id = p_tenant_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'tenant_not_found'; END IF;
  PERFORM public._audit_log('admin', v_uid, 'tenant_update', 'tenant', p_tenant_id, format('Updated tenant %s.', p_tenant_id), NULL);
  RETURN true;
END; $$;

-- ── Public tenant list ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.rpc_admin_tenant_list_public()
RETURNS TABLE (id uuid, code text, short_label text, university text, department text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  PERFORM public._get_auth_user_id();
  RETURN QUERY SELECT t.id, t.code, t.short_label, t.university, t.department FROM tenants t WHERE t.status = 'active' ORDER BY t.code;
END; $$;

-- ── Notification dispatch (internal) ────────────────────────
CREATE OR REPLACE FUNCTION public._dispatch_application_notification(
  p_type text, p_application_id uuid, p_recipient_email text, p_tenant_id uuid,
  p_applicant_name text DEFAULT NULL, p_tenant_short_label text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_url text;
BEGIN
  BEGIN
    v_url := current_setting('app.settings.supabase_url', true);
    IF v_url IS NULL OR v_url = '' THEN v_url := current_setting('pgrst.db_uri', true); END IF;
    IF v_url IS NOT NULL AND v_url <> '' THEN
      PERFORM net.http_post(url := v_url || '/functions/v1/notify-application',
        body := jsonb_build_object('type', p_type, 'application_id', p_application_id,
          'recipient_email', p_recipient_email, 'tenant_id', p_tenant_id,
          'applicant_name', p_applicant_name, 'tenant_name', p_tenant_short_label),
        headers := jsonb_build_object('Content-Type', 'application/json'));
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END; $$;

-- ── Application workflow ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.rpc_admin_application_submit(p_tenant_id uuid, p_name text, p_university text DEFAULT '', p_department text DEFAULT '')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_uid uuid; v_email text; v_id uuid; v_tsl text;
BEGIN
  v_uid := public._get_auth_user_id();
  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
  INSERT INTO tenant_admin_applications (tenant_id, applicant_email, applicant_name, university, department)
  VALUES (p_tenant_id, v_email, trim(p_name), COALESCE(trim(p_university),''), COALESCE(trim(p_department),''))
  RETURNING id INTO v_id;
  SELECT short_label INTO v_tsl FROM tenants WHERE id = p_tenant_id;
  PERFORM public._audit_log('admin', v_uid, 'application_submit', 'tenant_admin_application', v_id,
    format('Application submitted by %s for tenant %s.', v_email, COALESCE(v_tsl, p_tenant_id::text)),
    jsonb_build_object('tenant_id', p_tenant_id));
  PERFORM public._dispatch_application_notification('application_submitted', v_id, v_email, p_tenant_id, trim(p_name), v_tsl);
  RETURN v_id;
END; $$;

CREATE OR REPLACE FUNCTION public.rpc_admin_application_cancel(p_application_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_uid uuid; v_email text; v_app_email text;
BEGIN
  v_uid := public._get_auth_user_id();
  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
  SELECT applicant_email INTO v_app_email FROM tenant_admin_applications WHERE id = p_application_id;
  IF v_app_email IS NULL THEN RAISE EXCEPTION 'application_not_found'; END IF;
  IF lower(trim(v_email)) <> lower(trim(v_app_email)) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = 'P0403'; END IF;
  UPDATE tenant_admin_applications SET status = 'cancelled', updated_at = now() WHERE id = p_application_id AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'application_not_pending'; END IF;
  PERFORM public._audit_log('admin', v_uid, 'application_cancel', 'tenant_admin_application', p_application_id, 'Application cancelled by applicant.', NULL);
  RETURN true;
END; $$;

CREATE OR REPLACE FUNCTION public.rpc_admin_application_get_mine()
RETURNS TABLE (id uuid, tenant_id uuid, applicant_email text, applicant_name text, status text, created_at timestamptz, updated_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_uid uuid; v_email text;
BEGIN
  v_uid := public._get_auth_user_id();
  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
  RETURN QUERY SELECT a.id, a.tenant_id, a.applicant_email, a.applicant_name, a.status, a.created_at, a.updated_at
    FROM tenant_admin_applications a WHERE lower(trim(a.applicant_email)) = lower(trim(v_email)) ORDER BY a.created_at DESC;
END; $$;

CREATE OR REPLACE FUNCTION public.rpc_admin_application_approve(p_application_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_uid uuid; v_app tenant_admin_applications%ROWTYPE; v_user uuid; v_tsl text;
BEGIN
  SELECT * INTO v_app FROM tenant_admin_applications WHERE id = p_application_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'application_not_found'; END IF;
  v_uid := public._assert_tenant_admin(v_app.tenant_id);
  IF v_app.status <> 'pending' THEN RAISE EXCEPTION 'application_not_pending'; END IF;
  SELECT id INTO v_user FROM auth.users WHERE lower(trim(email)) = lower(trim(v_app.applicant_email)) LIMIT 1;
  IF v_user IS NULL THEN RAISE EXCEPTION 'applicant_user_not_found'; END IF;
  UPDATE tenant_admin_applications SET status = 'approved', reviewed_by = v_uid, reviewed_at = now(), updated_at = now() WHERE id = p_application_id;
  INSERT INTO tenant_admin_memberships (tenant_id, user_id, role) VALUES (v_app.tenant_id, v_user, 'tenant_admin') ON CONFLICT DO NOTHING;
  SELECT short_label INTO v_tsl FROM tenants WHERE id = v_app.tenant_id;
  PERFORM public._audit_log('admin', v_uid, 'application_approve', 'tenant_admin_application', p_application_id,
    format('Approved admin application for %s.', v_app.applicant_email), jsonb_build_object('tenant_id', v_app.tenant_id));
  PERFORM public._dispatch_application_notification('application_approved', p_application_id, v_app.applicant_email, v_app.tenant_id, v_app.applicant_name, v_tsl);
  RETURN true;
END; $$;

CREATE OR REPLACE FUNCTION public.rpc_admin_application_reject(p_application_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_uid uuid; v_app tenant_admin_applications%ROWTYPE; v_tsl text;
BEGIN
  SELECT * INTO v_app FROM tenant_admin_applications WHERE id = p_application_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'application_not_found'; END IF;
  v_uid := public._assert_tenant_admin(v_app.tenant_id);
  IF v_app.status <> 'pending' THEN RAISE EXCEPTION 'application_not_pending'; END IF;
  UPDATE tenant_admin_applications SET status = 'rejected', reviewed_by = v_uid, reviewed_at = now(), updated_at = now() WHERE id = p_application_id;
  SELECT short_label INTO v_tsl FROM tenants WHERE id = v_app.tenant_id;
  PERFORM public._audit_log('admin', v_uid, 'application_reject', 'tenant_admin_application', p_application_id,
    format('Rejected admin application for %s.', v_app.applicant_email), jsonb_build_object('tenant_id', v_app.tenant_id));
  PERFORM public._dispatch_application_notification('application_rejected', p_application_id, v_app.applicant_email, v_app.tenant_id, v_app.applicant_name, v_tsl);
  RETURN true;
END; $$;

CREATE OR REPLACE FUNCTION public.rpc_admin_application_list_pending(p_tenant_id uuid)
RETURNS TABLE (id uuid, tenant_id uuid, applicant_email text, applicant_name text, university text, department text, status text, created_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  PERFORM public._assert_tenant_admin(p_tenant_id);
  RETURN QUERY SELECT a.id, a.tenant_id, a.applicant_email, a.applicant_name, a.university, a.department, a.status, a.created_at
    FROM tenant_admin_applications a WHERE a.tenant_id = p_tenant_id AND a.status = 'pending' ORDER BY a.created_at ASC;
END; $$;

-- ── Admin profiles ──────────────────────────────────────────
DROP FUNCTION IF EXISTS public.rpc_admin_profile_upsert(text);
CREATE OR REPLACE FUNCTION public.rpc_admin_profile_upsert(p_display_name text DEFAULT NULL)
RETURNS TABLE (out_user_id uuid, out_display_name text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_uid uuid;
BEGIN
  v_uid := public._get_auth_user_id();
  INSERT INTO admin_profiles (user_id, display_name) VALUES (v_uid, NULLIF(trim(p_display_name),''))
  ON CONFLICT (user_id) DO UPDATE SET display_name = COALESCE(NULLIF(trim(EXCLUDED.display_name),''), admin_profiles.display_name), updated_at = now();
  RETURN QUERY SELECT ap.user_id, ap.display_name FROM admin_profiles ap WHERE ap.user_id = v_uid;
END; $$;

CREATE OR REPLACE FUNCTION public.rpc_admin_profile_get()
RETURNS TABLE (user_id uuid, display_name text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_uid uuid;
BEGIN
  v_uid := public._get_auth_user_id();
  RETURN QUERY SELECT ap.user_id, ap.display_name FROM admin_profiles ap WHERE ap.user_id = v_uid;
END; $$;

-- ── Grants ──────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public._get_auth_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public._assert_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public._assert_tenant_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public._assert_semester_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_auth_get_session() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_tenant_list() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_tenant_create(text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_tenant_update(uuid, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_tenant_list_public() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_application_submit(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_application_cancel(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_application_get_mine() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_application_approve(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_application_reject(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_application_list_pending(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_profile_upsert(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_profile_get() TO authenticated;
