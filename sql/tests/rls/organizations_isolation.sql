-- RLS: organizations — tenant isolation + super-admin bypass.
--
-- Policies under test (sql/migrations/004_rls.sql):
--   organizations_select            — member of the org OR super_admin
--   organizations_insert/update/delete — super_admin only
--   organizations_select_anon       — anon reads allowed (jury flow)

BEGIN;
SET LOCAL search_path = tap, public, extensions;
SELECT plan(6);

SELECT pgtap_test.seed_two_orgs();

-- ────────── admin A scope ──────────
SELECT pgtap_test.become_a();

SELECT is(
  (SELECT count(*)::int FROM organizations
   WHERE id = ANY (ARRAY[
     '11110000-0000-4000-8000-000000000001'::uuid,
     '22220000-0000-4000-8000-000000000002'::uuid
   ])),
  1,
  'org_admin A sees exactly 1 seeded org'::text
);

SELECT is(
  (SELECT code FROM organizations
   WHERE id = '11110000-0000-4000-8000-000000000001'::uuid),
  'pgtap-org-a'::text,
  'org_admin A sees their own org (org A)'::text
);

SELECT is(
  (SELECT count(*)::int FROM organizations
   WHERE id = '22220000-0000-4000-8000-000000000002'::uuid),
  0,
  'org_admin A cannot see org B'::text
);

-- ────────── admin B scope ──────────
SELECT pgtap_test.become_reset();
SELECT pgtap_test.become_b();

SELECT is(
  (SELECT code FROM organizations
   WHERE id = '22220000-0000-4000-8000-000000000002'::uuid),
  'pgtap-org-b'::text,
  'org_admin B sees their own org (org B)'::text
);

-- ────────── super admin scope ──────────
SELECT pgtap_test.become_reset();
SELECT pgtap_test.become_super();

SELECT is(
  (SELECT count(*)::int FROM organizations
   WHERE id = ANY (ARRAY[
     '11110000-0000-4000-8000-000000000001'::uuid,
     '22220000-0000-4000-8000-000000000002'::uuid
   ])),
  2,
  'super_admin sees both seeded orgs'::text
);

SELECT lives_ok(
  $lives$UPDATE organizations SET name = 'pgtap Org A renamed'
         WHERE id = '11110000-0000-4000-8000-000000000001'$lives$,
  'super_admin can UPDATE organizations'::text
);

SELECT pgtap_test.become_reset();
SELECT COALESCE(
  NULLIF((SELECT string_agg(t, E'\n') FROM finish() AS t), ''),
  'ALL TESTS PASSED'
) AS result;
ROLLBACK;
