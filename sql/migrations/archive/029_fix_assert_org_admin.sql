-- 029_fix_assert_org_admin.sql
-- Recreates _assert_org_admin (accidentally dropped in 028) and adds
-- rpc_admin_find_user_by_email helper for the invite-org-admin Edge Function.

-- ── 1. Recreate _assert_org_admin ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION _assert_org_admin(p_org_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM memberships
    WHERE user_id = auth.uid()
      AND (organization_id = p_org_id OR role = 'super_admin')
  ) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION _assert_org_admin(UUID) TO authenticated;

-- ── 2. User lookup by email (service-role only) ───────────────────────────────
-- Used by the invite-org-admin Edge Function to check if a Supabase Auth user
-- already exists for the given email address.
CREATE OR REPLACE FUNCTION rpc_admin_find_user_by_email(p_email TEXT)
RETURNS TABLE (id UUID, email_confirmed_at TIMESTAMPTZ)
LANGUAGE sql
SECURITY DEFINER
SET search_path = auth, public AS $$
  SELECT u.id, u.email_confirmed_at
  FROM auth.users u
  WHERE lower(u.email) = lower(trim(p_email))
  LIMIT 1;
$$;

-- Restrict to service_role only — anon/authenticated must not call this
REVOKE EXECUTE ON FUNCTION rpc_admin_find_user_by_email(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION rpc_admin_find_user_by_email(TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION rpc_admin_find_user_by_email(TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION rpc_admin_find_user_by_email(TEXT) TO service_role;
