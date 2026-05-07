-- RLS: frameworks — tenant-scoped. Shared platform frameworks (organization_id
-- IS NULL, e.g. MÜDEK / ABET templates) are readable by every authenticated
-- user; per-org clones are readable only by members of that org.

BEGIN;
SET LOCAL search_path = tap, public, extensions;
SELECT plan(4);

SELECT pgtap_test.seed_two_orgs();

INSERT INTO frameworks (id, organization_id, name) VALUES
  ('f1110000-0000-4000-8000-000000000001'::uuid,
   '11110000-0000-4000-8000-000000000001'::uuid, 'pgtap framework A'),
  ('f2220000-0000-4000-8000-000000000002'::uuid,
   '22220000-0000-4000-8000-000000000002'::uuid, 'pgtap framework B'),
  ('f0000000-0000-4000-8000-000000000000'::uuid,
   NULL, 'pgtap shared framework')
ON CONFLICT (id) DO NOTHING;

-- ────────── admin A sees own + shared, not B ──────────
SELECT pgtap_test.become_a();

SELECT is(
  (SELECT count(*)::int FROM frameworks
   WHERE id = 'f1110000-0000-4000-8000-000000000001'::uuid),
  1,
  'admin A sees own-org framework'::text
);

SELECT is(
  (SELECT count(*)::int FROM frameworks
   WHERE id = 'f0000000-0000-4000-8000-000000000000'::uuid),
  1,
  'admin A sees shared (organization_id IS NULL) framework'::text
);

SELECT is(
  (SELECT count(*)::int FROM frameworks
   WHERE id = 'f2220000-0000-4000-8000-000000000002'::uuid),
  0,
  'admin A cannot see org B framework'::text
);

-- ────────── admin B does NOT see org A framework ──────────
SELECT pgtap_test.become_reset();
SELECT pgtap_test.become_b();

SELECT is(
  (SELECT count(*)::int FROM frameworks
   WHERE id = 'f1110000-0000-4000-8000-000000000001'::uuid),
  0,
  'admin B cannot see org A framework'::text
);

SELECT pgtap_test.become_reset();
SELECT COALESCE(
  NULLIF((SELECT string_agg(t, E'\n') FROM finish() AS t), ''),
  'ALL TESTS PASSED'
) AS result;
ROLLBACK;
