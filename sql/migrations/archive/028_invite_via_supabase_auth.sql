-- 028_invite_via_supabase_auth.sql
-- Replaces custom admin_invites token system with Supabase auth.admin.inviteUserByEmail.
-- memberships.status tracks active vs invited state; auto-promoted by trigger.

-- ── 1. Add status column to memberships ──────────────────────────────────────
ALTER TABLE memberships
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'invited'));

-- ── 2. Trigger: auto-promote 'invited' → 'active' on email confirmation ──────
CREATE OR REPLACE FUNCTION handle_invite_confirmed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    UPDATE memberships
    SET status = 'active'
    WHERE user_id = NEW.id AND status = 'invited';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_confirmed
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_invite_confirmed();

-- ── 3. RPC: cancel invite (delete invited membership) ────────────────────────
CREATE OR REPLACE FUNCTION rpc_org_admin_cancel_invite(p_membership_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_org_id UUID;
BEGIN
  SELECT organization_id INTO v_org_id
  FROM memberships
  WHERE id = p_membership_id AND status = 'invited';

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'invite_not_found';
  END IF;

  PERFORM _assert_org_admin(v_org_id);

  DELETE FROM memberships WHERE id = p_membership_id AND status = 'invited';

  RETURN jsonb_build_object('ok', true, 'membership_id', p_membership_id);
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_org_admin_cancel_invite(UUID) TO authenticated;

-- ── 4. Update rpc_admin_list_organizations: include membership status ─────────
CREATE OR REPLACE FUNCTION public.rpc_admin_list_organizations()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_result JSON;
BEGIN
  IF NOT current_user_is_super_admin() THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT COALESCE(
    json_agg(
      jsonb_build_object(
        'id',                 o.id,
        'code',               o.code,
        'name',               o.name,
        'institution',        o.institution,
        'contact_email',      o.contact_email,
        'status',             o.status,
        'settings',           o.settings,
        'created_at',         o.created_at,
        'updated_at',         o.updated_at,
        'active_period_name', p_curr.name,
        'juror_count',        j_cnt.juror_count,
        'project_count',      pr_cnt.project_count,
        'memberships',        m_agg.data,
        'org_applications',   a_agg.data
      ) ORDER BY o.name
    ),
    '[]'::json
  )
  INTO v_result
  FROM organizations o
  LEFT JOIN LATERAL (
    SELECT name
    FROM periods
    WHERE organization_id = o.id AND is_current = true
    LIMIT 1
  ) p_curr ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS juror_count
    FROM jurors j
    WHERE j.organization_id = o.id
  ) j_cnt ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS project_count
    FROM periods cp
    JOIN projects pr ON pr.period_id = cp.id
    WHERE cp.organization_id = o.id AND cp.is_current = true
  ) pr_cnt ON true
  LEFT JOIN LATERAL (
    SELECT COALESCE(
      json_agg(
        jsonb_build_object(
          'id',              m.id,
          'user_id',         m.user_id,
          'organization_id', m.organization_id,
          'role',            m.role,
          'status',          m.status,
          'created_at',      m.created_at,
          'profiles', jsonb_build_object(
            'id',           p.id,
            'display_name', p.display_name,
            'email',        u.email
          )
        )
      ),
      '[]'::json
    ) AS data
    FROM memberships m
    LEFT JOIN profiles p ON p.id = m.user_id
    LEFT JOIN auth.users u ON u.id = m.user_id
    WHERE m.organization_id = o.id
  ) m_agg ON true
  LEFT JOIN LATERAL (
    SELECT COALESCE(
      json_agg(
        jsonb_build_object(
          'id',              a.id,
          'organization_id', a.organization_id,
          'applicant_name',  a.applicant_name,
          'contact_email',   a.contact_email,
          'status',          a.status,
          'created_at',      a.created_at
        )
      ),
      '[]'::json
    ) AS data
    FROM org_applications a
    WHERE a.organization_id = o.id
  ) a_agg ON true;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_list_organizations() TO authenticated;

-- ── 5. Drop admin_invites table and related RPCs ──────────────────────────────
DROP FUNCTION IF EXISTS rpc_admin_invite_send(UUID, TEXT);
DROP FUNCTION IF EXISTS rpc_admin_invite_list(UUID);
DROP FUNCTION IF EXISTS rpc_admin_invite_resend(UUID);
DROP FUNCTION IF EXISTS rpc_admin_invite_cancel(UUID);
DROP FUNCTION IF EXISTS rpc_admin_invite_get_payload(UUID);
DROP FUNCTION IF EXISTS rpc_admin_invite_mark_accepted(UUID, UUID);
-- NOTE: _assert_org_admin is still used by rpc_org_admin_cancel_invite — do NOT drop it.

DROP TABLE IF EXISTS admin_invites CASCADE;
