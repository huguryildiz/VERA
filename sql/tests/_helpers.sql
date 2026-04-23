-- pgTAP shared fixtures for VERA tests.
--
-- Idempotent: CREATE OR REPLACE so it can be re-applied at the start of any
-- test session without reset. All fixture rows use deterministic UUIDs with a
-- "pgtap" prefix so they are obviously test-only and easy to clean up.
--
-- Install once per database:
--   psql "$DATABASE_URL" -f sql/tests/_helpers.sql
--
-- Each test file wraps its body in BEGIN/ROLLBACK and calls the helpers it
-- needs; no persistent state is introduced.

CREATE SCHEMA IF NOT EXISTS pgtap_test;

-- ---------------------------------------------------------------------------
-- pgtap_test.seed_two_orgs()
--   Creates two orgs, two org_admins (one per org), one super admin, and the
--   auth.users + profiles rows they depend on. Safe to call inside a test
--   transaction; all rows use the "pgtap_" prefix and fixed UUIDs.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION pgtap_test.seed_two_orgs()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- auth.users (bare-minimum columns; FK targets for profiles.id)
  INSERT INTO auth.users (id, instance_id, aud, role, email) VALUES
    ('aaaa0000-0000-4000-8000-000000000001'::uuid,
     '00000000-0000-0000-0000-000000000000'::uuid,
     'authenticated', 'authenticated', 'pgtap_admin_a@test.local'),
    ('bbbb0000-0000-4000-8000-000000000002'::uuid,
     '00000000-0000-0000-0000-000000000000'::uuid,
     'authenticated', 'authenticated', 'pgtap_admin_b@test.local'),
    ('eeee0000-0000-4000-8000-00000000000e'::uuid,
     '00000000-0000-0000-0000-000000000000'::uuid,
     'authenticated', 'authenticated', 'pgtap_super@test.local')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO profiles (id, display_name) VALUES
    ('aaaa0000-0000-4000-8000-000000000001'::uuid, 'pgtap Admin A'),
    ('bbbb0000-0000-4000-8000-000000000002'::uuid, 'pgtap Admin B'),
    ('eeee0000-0000-4000-8000-00000000000e'::uuid, 'pgtap Super')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO organizations (id, code, name) VALUES
    ('11110000-0000-4000-8000-000000000001'::uuid, 'pgtap-org-a', 'pgtap Org A'),
    ('22220000-0000-4000-8000-000000000002'::uuid, 'pgtap-org-b', 'pgtap Org B')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO memberships (user_id, organization_id, role, status, is_owner) VALUES
    ('aaaa0000-0000-4000-8000-000000000001'::uuid,
     '11110000-0000-4000-8000-000000000001'::uuid, 'org_admin', 'active', true),
    ('bbbb0000-0000-4000-8000-000000000002'::uuid,
     '22220000-0000-4000-8000-000000000002'::uuid, 'org_admin', 'active', true),
    ('eeee0000-0000-4000-8000-00000000000e'::uuid,
     NULL, 'super_admin', 'active', false)
  ON CONFLICT (user_id, organization_id) DO NOTHING;
END;
$$;

-- ---------------------------------------------------------------------------
-- pgtap_test.seed_periods()
--   One unlocked + one locked period in each org (4 total). Depends on
--   seed_two_orgs() having run first.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION pgtap_test.seed_periods()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO periods (id, organization_id, name, season, is_locked) VALUES
    ('cccc0000-0000-4000-8000-000000000001'::uuid,
     '11110000-0000-4000-8000-000000000001'::uuid, 'pgtap Period A1', 'Spring', false),
    ('cccc0000-0000-4000-8000-000000000011'::uuid,
     '11110000-0000-4000-8000-000000000001'::uuid, 'pgtap Period A2 (locked)', 'Spring', true),
    ('dddd0000-0000-4000-8000-000000000002'::uuid,
     '22220000-0000-4000-8000-000000000002'::uuid, 'pgtap Period B1', 'Fall', false),
    ('dddd0000-0000-4000-8000-000000000022'::uuid,
     '22220000-0000-4000-8000-000000000002'::uuid, 'pgtap Period B2 (locked)', 'Fall', true)
  ON CONFLICT (id) DO NOTHING;
END;
$$;

-- ---------------------------------------------------------------------------
-- pgtap_test.seed_projects()
--   One project per org's first period. Depends on seed_periods().
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION pgtap_test.seed_projects()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO projects (id, period_id, title, advisor_name) VALUES
    ('33330000-0000-4000-8000-000000000001'::uuid,
     'cccc0000-0000-4000-8000-000000000001'::uuid, 'pgtap Project A', 'Advisor A'),
    ('44440000-0000-4000-8000-000000000002'::uuid,
     'dddd0000-0000-4000-8000-000000000002'::uuid, 'pgtap Project B', 'Advisor B')
  ON CONFLICT (id) DO NOTHING;
END;
$$;

-- ---------------------------------------------------------------------------
-- pgtap_test.seed_jurors()
--   One juror per org. Depends on seed_two_orgs().
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION pgtap_test.seed_jurors()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO jurors (id, organization_id, juror_name, affiliation, email) VALUES
    ('55550000-0000-4000-8000-000000000001'::uuid,
     '11110000-0000-4000-8000-000000000001'::uuid, 'pgtap Juror A', 'pgtap dept', 'pgtap_juror_a@test.local'),
    ('66660000-0000-4000-8000-000000000002'::uuid,
     '22220000-0000-4000-8000-000000000002'::uuid, 'pgtap Juror B', 'pgtap dept', 'pgtap_juror_b@test.local')
  ON CONFLICT (id) DO NOTHING;
END;
$$;

-- ---------------------------------------------------------------------------
-- pgtap_test.seed_entry_tokens()
--   One valid + one revoked entry token per org period.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION pgtap_test.seed_entry_tokens()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO entry_tokens (id, period_id, token_hash, token_plain, is_revoked, expires_at) VALUES
    ('77770000-0000-4000-8000-000000000001'::uuid,
     'cccc0000-0000-4000-8000-000000000001'::uuid,
     encode(digest('pgtap-token-a', 'sha256'), 'hex'),
     'pgtap-token-a', false, now() + interval '1 day'),
    ('77770000-0000-4000-8000-000000000002'::uuid,
     'dddd0000-0000-4000-8000-000000000002'::uuid,
     encode(digest('pgtap-token-b', 'sha256'), 'hex'),
     'pgtap-token-b', false, now() + interval '1 day')
  ON CONFLICT (id) DO NOTHING;
END;
$$;

-- ---------------------------------------------------------------------------
-- pgtap_test.become(user_id)
--   Switch the current transaction to run as `authenticated` role with the
--   given sub. Use inside tests AFTER all seed data has been inserted (once
--   you drop superuser you cannot INSERT into privileged tables).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION pgtap_test.become(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  EXECUTE format(
    'SET LOCAL request.jwt.claims = %L',
    json_build_object('sub', p_user_id, 'role', 'authenticated')::text
  );
  SET LOCAL role authenticated;
END;
$$;

-- ---------------------------------------------------------------------------
-- pgtap_test.become_super()   -- shortcut for super admin context
-- pgtap_test.become_a()       -- shortcut for org A admin
-- pgtap_test.become_b()       -- shortcut for org B admin
-- pgtap_test.become_reset()   -- drop back to postgres
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION pgtap_test.become_super()
RETURNS void LANGUAGE sql AS $$
  SELECT pgtap_test.become('eeee0000-0000-4000-8000-00000000000e'::uuid);
$$;

CREATE OR REPLACE FUNCTION pgtap_test.become_a()
RETURNS void LANGUAGE sql AS $$
  SELECT pgtap_test.become('aaaa0000-0000-4000-8000-000000000001'::uuid);
$$;

CREATE OR REPLACE FUNCTION pgtap_test.become_b()
RETURNS void LANGUAGE sql AS $$
  SELECT pgtap_test.become('bbbb0000-0000-4000-8000-000000000002'::uuid);
$$;

CREATE OR REPLACE FUNCTION pgtap_test.become_reset()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  RESET role;
  RESET request.jwt.claims;
END;
$$;

-- Grant execute so tests running under `authenticated` can call them if needed.
GRANT USAGE ON SCHEMA pgtap_test TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pgtap_test TO authenticated;

COMMENT ON SCHEMA pgtap_test IS
  'VERA pgTAP test fixtures. Safe to drop; not referenced by application code.';
