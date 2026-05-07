-- RLS: score_sheets + score_sheet_items — tenant-scoped via period→org.

BEGIN;
SET LOCAL search_path = tap, public, extensions;
SELECT plan(4);

SELECT pgtap_test.seed_two_orgs();
SELECT pgtap_test.seed_periods();
SELECT pgtap_test.seed_projects();
SELECT pgtap_test.seed_jurors();

-- period_criteria snapshot rows are required because score_sheet_items FKs them.
INSERT INTO period_criteria (id, period_id, key, label, max_score, weight, sort_order)
VALUES
  ('a1110000-0000-4000-8000-000000000001'::uuid,
   'cccc0000-0000-4000-8000-000000000001'::uuid,
   'pgtap_c_a', 'pgtap criterion A', 10, 1.0, 1),
  ('b2220000-0000-4000-8000-000000000002'::uuid,
   'dddd0000-0000-4000-8000-000000000002'::uuid,
   'pgtap_c_b', 'pgtap criterion B', 10, 1.0, 1)
ON CONFLICT (id) DO NOTHING;

-- Score sheets: one per org, by each org's juror on each org's project.
INSERT INTO score_sheets (id, juror_id, project_id, period_id, status) VALUES
  ('e1110000-0000-4000-8000-000000000001'::uuid,
   '55550000-0000-4000-8000-000000000001'::uuid,
   '33330000-0000-4000-8000-000000000001'::uuid,
   'cccc0000-0000-4000-8000-000000000001'::uuid, 'in_progress'),
  ('f2220000-0000-4000-8000-000000000002'::uuid,
   '66660000-0000-4000-8000-000000000002'::uuid,
   '44440000-0000-4000-8000-000000000002'::uuid,
   'dddd0000-0000-4000-8000-000000000002'::uuid, 'in_progress')
ON CONFLICT (juror_id, project_id) DO NOTHING;

INSERT INTO score_sheet_items (id, score_sheet_id, period_criterion_id, score_value)
VALUES
  ('a8880000-0000-4000-8000-000000000001'::uuid,
   'e1110000-0000-4000-8000-000000000001'::uuid,
   'a1110000-0000-4000-8000-000000000001'::uuid, 7.5),
  ('b9990000-0000-4000-8000-000000000002'::uuid,
   'f2220000-0000-4000-8000-000000000002'::uuid,
   'b2220000-0000-4000-8000-000000000002'::uuid, 8.0)
ON CONFLICT (id) DO NOTHING;

-- ────────── admin A scope ──────────
SELECT pgtap_test.become_a();

SELECT is(
  (SELECT count(*)::int FROM score_sheets
   WHERE id = ANY (ARRAY[
     'e1110000-0000-4000-8000-000000000001'::uuid,
     'f2220000-0000-4000-8000-000000000002'::uuid
   ])),
  1,
  'admin A sees score_sheets only in their own period'::text
);

SELECT is(
  (SELECT count(*)::int FROM score_sheet_items
   WHERE id = ANY (ARRAY[
     'a8880000-0000-4000-8000-000000000001'::uuid,
     'b9990000-0000-4000-8000-000000000002'::uuid
   ])),
  1,
  'admin A sees score_sheet_items only in their own period'::text
);

-- ────────── admin B cannot see org A scores ──────────
SELECT pgtap_test.become_reset();
SELECT pgtap_test.become_b();

SELECT is(
  (SELECT count(*)::int FROM score_sheets
   WHERE id = 'e1110000-0000-4000-8000-000000000001'::uuid),
  0,
  'admin B cannot see org A score_sheets'::text
);

SELECT is(
  (SELECT count(*)::int FROM score_sheet_items
   WHERE id = 'a8880000-0000-4000-8000-000000000001'::uuid),
  0,
  'admin B cannot see org A score_sheet_items'::text
);

SELECT pgtap_test.become_reset();
SELECT COALESCE(
  NULLIF((SELECT string_agg(t, E'\n') FROM finish() AS t), ''),
  'ALL TESTS PASSED'
) AS result;
ROLLBACK;
