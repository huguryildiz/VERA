-- RLS: jurors — tenant-scoped via organization_id.

BEGIN;
SET LOCAL search_path = tap, public, extensions;
SELECT plan(3);

SELECT pgtap_test.seed_two_orgs();
SELECT pgtap_test.seed_jurors();

-- ────────── admin A scope ──────────
SELECT pgtap_test.become_a();

SELECT is(
  (SELECT count(*)::int FROM jurors
   WHERE id = ANY (ARRAY[
     '55550000-0000-4000-8000-000000000001'::uuid,
     '66660000-0000-4000-8000-000000000002'::uuid
   ])),
  1,
  'admin A sees exactly 1 seeded juror (own org)'::text
);

SELECT is(
  (SELECT juror_name FROM jurors
   WHERE id = '55550000-0000-4000-8000-000000000001'::uuid),
  'pgtap Juror A'::text,
  'admin A sees juror A'::text
);

-- ────────── admin B cannot see juror A ──────────
SELECT pgtap_test.become_reset();
SELECT pgtap_test.become_b();

SELECT is(
  (SELECT count(*)::int FROM jurors
   WHERE id = '55550000-0000-4000-8000-000000000001'::uuid),
  0,
  'admin B cannot see juror A'::text
);

SELECT pgtap_test.become_reset();
SELECT COALESCE(
  NULLIF((SELECT string_agg(t, E'\n') FROM finish() AS t), ''),
  'ALL TESTS PASSED'
) AS result;
ROLLBACK;
