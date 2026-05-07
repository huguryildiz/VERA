-- RLS: projects — tenant-scoped via periods.organization_id.

BEGIN;
SET LOCAL search_path = tap, public, extensions;
SELECT plan(3);

SELECT pgtap_test.seed_two_orgs();
SELECT pgtap_test.seed_periods();
SELECT pgtap_test.seed_projects();

-- ────────── admin A scope ──────────
SELECT pgtap_test.become_a();

SELECT is(
  (SELECT count(*)::int FROM projects
   WHERE id = ANY (ARRAY[
     '33330000-0000-4000-8000-000000000001'::uuid,
     '44440000-0000-4000-8000-000000000002'::uuid
   ])),
  1,
  'admin A sees exactly 1 seeded project (own org)'::text
);

SELECT is(
  (SELECT title FROM projects
   WHERE id = '33330000-0000-4000-8000-000000000001'::uuid),
  'pgtap Project A'::text,
  'admin A sees project A'::text
);

-- ────────── admin B scope ──────────
SELECT pgtap_test.become_reset();
SELECT pgtap_test.become_b();

SELECT is(
  (SELECT count(*)::int FROM projects
   WHERE id = '33330000-0000-4000-8000-000000000001'::uuid),
  0,
  'admin B cannot see project A'::text
);

SELECT pgtap_test.become_reset();
SELECT COALESCE(
  NULLIF((SELECT string_agg(t, E'\n') FROM finish() AS t), ''),
  'ALL TESTS PASSED'
) AS result;
ROLLBACK;
