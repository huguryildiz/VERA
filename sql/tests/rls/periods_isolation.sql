-- RLS: periods — tenant-scoped via memberships.organization_id,
-- PLUS `periods_select_public_visible` (is_locked = true) exposes locked
-- periods to every caller (including anon, for the jury identity step).
--
-- Policies (sql/migrations/004_rls.sql):
--   periods_select                 — auth.uid() is in the period's org, OR super_admin
--   periods_select_public_visible  — any caller sees rows with is_locked = true
--   periods_insert/update/delete   — tenant-scoped (org_admin) or super_admin

BEGIN;
SET LOCAL search_path = tap, public, extensions;
SELECT plan(4);

SELECT pgtap_test.seed_two_orgs();
SELECT pgtap_test.seed_periods();

-- ────────── admin A: own-org periods ──────────
SELECT pgtap_test.become_a();

SELECT is(
  (SELECT count(*)::int FROM periods
   WHERE organization_id = '11110000-0000-4000-8000-000000000001'::uuid),
  2,
  'admin A sees both periods in org A (unlocked + locked)'::text
);

-- The unlocked period B1 must stay hidden from admin A.
SELECT is(
  (SELECT count(*)::int FROM periods
   WHERE id = 'dddd0000-0000-4000-8000-000000000002'::uuid),
  0,
  'admin A cannot see unlocked period in org B'::text
);

-- The locked period B2 is exposed publicly via periods_select_public_visible.
SELECT is(
  (SELECT count(*)::int FROM periods
   WHERE id = 'dddd0000-0000-4000-8000-000000000022'::uuid),
  1,
  'admin A sees locked period in org B (public policy)'::text
);

-- ────────── admin B cannot see unlocked period A1 ──────────
SELECT pgtap_test.become_reset();
SELECT pgtap_test.become_b();

SELECT is(
  (SELECT count(*)::int FROM periods
   WHERE id = 'cccc0000-0000-4000-8000-000000000001'::uuid),
  0,
  'admin B cannot see unlocked period in org A'::text
);

SELECT pgtap_test.become_reset();
SELECT COALESCE(
  NULLIF((SELECT string_agg(t, E'\n') FROM finish() AS t), ''),
  'ALL TESTS PASSED'
) AS result;
ROLLBACK;
