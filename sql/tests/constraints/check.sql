-- pgTAP: CHECK constraint enforcement
-- Tests that critical CHECK constraints reject violating inserts with SQLSTATE 23514.
--
-- Constraints tested:
--   score_sheet_items.score_value >= 0 (EXISTS on vera-demo)
--
-- Note: period_criteria.max_score > 0 and period_criteria.weight >= 0 CHECK constraints
-- do NOT exist on vera-demo schema, so they are omitted from this test.

BEGIN;
SET LOCAL search_path = tap, public, extensions;
SELECT plan(1);

SELECT pgtap_test.seed_two_orgs();
SELECT pgtap_test.seed_periods();
SELECT pgtap_test.seed_projects();
SELECT pgtap_test.seed_jurors();

-- ────────── score_sheet_items.score_value >= 0 ──────────
-- Insert a valid score sheet and criterion first
INSERT INTO period_criteria (period_id, key, label, max_score, weight)
  VALUES ('cccc0000-0000-4000-8000-000000000001'::uuid, 'score-check-test', 'Test', 10, 1);
INSERT INTO score_sheets (juror_id, project_id, period_id)
  VALUES ('55550000-0000-4000-8000-000000000001'::uuid, '33330000-0000-4000-8000-000000000001'::uuid, 'cccc0000-0000-4000-8000-000000000001'::uuid);

-- Attempt to insert with score_value < 0
PREPARE bad_score_value_neg AS INSERT INTO score_sheet_items (score_sheet_id, period_criterion_id, score_value)
  SELECT
    (SELECT id FROM score_sheets WHERE juror_id = '55550000-0000-4000-8000-000000000001'::uuid LIMIT 1),
    (SELECT id FROM period_criteria WHERE key = 'score-check-test' LIMIT 1),
    -2.5;
SELECT throws_ok('EXECUTE bad_score_value_neg', '23514', NULL,
  'score_sheet_items.score_value >= 0 rejects negative');

SELECT COALESCE(
  NULLIF((SELECT string_agg(t, E'\n') FROM finish() AS t), ''),
  'ALL TESTS PASSED'
) AS result;
ROLLBACK;
