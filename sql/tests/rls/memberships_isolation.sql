-- RLS: memberships — users see only their own membership rows (or super_admin).
--
-- Policies (sql/migrations/004_rls.sql):
--   memberships_select             — user_id = auth.uid() OR super_admin
--   memberships_insert/update/delete — super_admin only
--   memberships_select_org_admin_join_requests — org admins see 'requested'
--                                                rows for orgs they admin.

BEGIN;
SET LOCAL search_path = tap, public, extensions;
SELECT plan(5);

SELECT pgtap_test.seed_two_orgs();

-- Seed a 'requested' join request against org A by a new user, to test the
-- join-requests policy.
INSERT INTO auth.users (id, instance_id, aud, role, email) VALUES
  ('cccccccc-0000-4000-8000-000000000003'::uuid,
   '00000000-0000-0000-0000-000000000000'::uuid,
   'authenticated','authenticated','pgtap_applicant@test.local')
ON CONFLICT (id) DO NOTHING;
INSERT INTO profiles (id, display_name) VALUES
  ('cccccccc-0000-4000-8000-000000000003'::uuid, 'pgtap Applicant')
ON CONFLICT (id) DO NOTHING;
INSERT INTO memberships (user_id, organization_id, role, status) VALUES
  ('cccccccc-0000-4000-8000-000000000003'::uuid,
   '11110000-0000-4000-8000-000000000001'::uuid, 'org_admin', 'requested')
ON CONFLICT (user_id, organization_id) DO NOTHING;

-- ────────── admin A sees only own + join-request to A ──────────
SELECT pgtap_test.become_a();

SELECT is(
  (SELECT count(*)::int FROM memberships
   WHERE user_id = 'aaaa0000-0000-4000-8000-000000000001'::uuid),
  1,
  'admin A sees their own active membership'::text
);

SELECT is(
  (SELECT count(*)::int FROM memberships
   WHERE user_id = 'bbbb0000-0000-4000-8000-000000000002'::uuid),
  0,
  'admin A cannot see admin B membership'::text
);

SELECT is(
  (SELECT count(*)::int FROM memberships
   WHERE status = 'requested'
     AND organization_id = '11110000-0000-4000-8000-000000000001'::uuid),
  1,
  'admin A sees pending join requests for their own org'::text
);

-- ────────── admin B cannot see admin A or join requests to org A ──────────
SELECT pgtap_test.become_reset();
SELECT pgtap_test.become_b();

SELECT is(
  (SELECT count(*)::int FROM memberships
   WHERE organization_id = '11110000-0000-4000-8000-000000000001'::uuid),
  0,
  'admin B cannot see memberships of org A (nor its join requests)'::text
);

-- ────────── super admin sees all ──────────
SELECT pgtap_test.become_reset();
SELECT pgtap_test.become_super();

SELECT cmp_ok(
  (SELECT count(*)::int FROM memberships
   WHERE user_id = ANY (ARRAY[
     'aaaa0000-0000-4000-8000-000000000001'::uuid,
     'bbbb0000-0000-4000-8000-000000000002'::uuid,
     'cccccccc-0000-4000-8000-000000000003'::uuid,
     'eeee0000-0000-4000-8000-00000000000e'::uuid
   ])),
  '>='::text,
  4,
  'super_admin sees all seeded + own memberships (>= 4)'::text
);

SELECT pgtap_test.become_reset();
SELECT COALESCE(
  NULLIF((SELECT string_agg(t, E'\n') FROM finish() AS t), ''),
  'ALL TESTS PASSED'
) AS result;
ROLLBACK;
