-- RLS: entry_tokens — tenant-scoped via periods.organization_id.

BEGIN;
SET LOCAL search_path = tap, public, extensions;
SELECT plan(3);

SELECT pgtap_test.seed_two_orgs();
SELECT pgtap_test.seed_periods();
SELECT pgtap_test.seed_entry_tokens();

-- ────────── admin A scope ──────────
SELECT pgtap_test.become_a();

SELECT is(
  (SELECT count(*)::int FROM entry_tokens
   WHERE id = ANY (ARRAY[
     '77770000-0000-4000-8000-000000000001'::uuid,
     '77770000-0000-4000-8000-000000000002'::uuid
   ])),
  1,
  'admin A sees exactly 1 seeded entry_token (own period)'::text
);

SELECT is(
  (SELECT period_id FROM entry_tokens
   WHERE id = '77770000-0000-4000-8000-000000000001'::uuid),
  'cccc0000-0000-4000-8000-000000000001'::uuid,
  'admin A sees entry_token for their own period'::text
);

-- ────────── admin B cannot see org A tokens ──────────
SELECT pgtap_test.become_reset();
SELECT pgtap_test.become_b();

SELECT is(
  (SELECT count(*)::int FROM entry_tokens
   WHERE id = '77770000-0000-4000-8000-000000000001'::uuid),
  0,
  'admin B cannot see entry_token in org A'::text
);

SELECT pgtap_test.become_reset();
SELECT COALESCE(
  NULLIF((SELECT string_agg(t, E'\n') FROM finish() AS t), ''),
  'ALL TESTS PASSED'
) AS result;
ROLLBACK;
