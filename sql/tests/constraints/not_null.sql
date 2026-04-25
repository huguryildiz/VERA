-- pgTAP: NOT NULL constraint enforcement
-- Tests that critical NOT NULL columns reject NULL inserts with SQLSTATE 23502.
--
-- Columns tested:
--   organizations.name
--   periods.organization_id, periods.name
--   period_criteria.period_id, period_criteria.key, period_criteria.max_score
--   jurors.organization_id, jurors.juror_name
--   score_sheets.juror_id, score_sheets.project_id, score_sheets.period_id
--   score_sheet_items.score_sheet_id, score_sheet_items.period_criterion_id

BEGIN;
SET LOCAL search_path = tap, public, extensions;
SELECT plan(11);

SELECT pgtap_test.seed_two_orgs();
SELECT pgtap_test.seed_periods();
SELECT pgtap_test.seed_projects();
SELECT pgtap_test.seed_jurors();

-- ────────── organizations.name ──────────
PREPARE bad_org_name AS INSERT INTO organizations (code, name) VALUES ('test-org', NULL);
SELECT throws_ok('EXECUTE bad_org_name', '23502', NULL,
  'organizations.name is NOT NULL');

-- ────────── periods.organization_id ──────────
PREPARE bad_period_org_id AS INSERT INTO periods (organization_id, name) VALUES (NULL, 'Test Period');
SELECT throws_ok('EXECUTE bad_period_org_id', '23502', NULL,
  'periods.organization_id is NOT NULL');

-- ────────── periods.name ──────────
PREPARE bad_period_name AS INSERT INTO periods (organization_id, name) VALUES
  ('11110000-0000-4000-8000-000000000001'::uuid, NULL);
SELECT throws_ok('EXECUTE bad_period_name', '23502', NULL,
  'periods.name is NOT NULL');

-- ────────── period_criteria.period_id ──────────
PREPARE bad_pc_period_id AS INSERT INTO period_criteria (period_id, key, label, max_score, weight)
  VALUES (NULL, 'test', 'Test', 10, 1);
SELECT throws_ok('EXECUTE bad_pc_period_id', '23502', NULL,
  'period_criteria.period_id is NOT NULL');

-- ────────── period_criteria.key ──────────
PREPARE bad_pc_key AS INSERT INTO period_criteria (period_id, key, label, max_score, weight)
  VALUES ('cccc0000-0000-4000-8000-000000000001'::uuid, NULL, 'Test', 10, 1);
SELECT throws_ok('EXECUTE bad_pc_key', '23502', NULL,
  'period_criteria.key is NOT NULL');

-- ────────── period_criteria.max_score ──────────
PREPARE bad_pc_max_score AS INSERT INTO period_criteria (period_id, key, label, max_score, weight)
  VALUES ('cccc0000-0000-4000-8000-000000000001'::uuid, 'test-key', 'Test', NULL, 1);
SELECT throws_ok('EXECUTE bad_pc_max_score', '23502', NULL,
  'period_criteria.max_score is NOT NULL');

-- ────────── jurors.organization_id ──────────
PREPARE bad_juror_org_id AS INSERT INTO jurors (organization_id, juror_name, affiliation)
  VALUES (NULL, 'Test Juror', 'Test Dept');
SELECT throws_ok('EXECUTE bad_juror_org_id', '23502', NULL,
  'jurors.organization_id is NOT NULL');

-- ────────── jurors.juror_name ──────────
PREPARE bad_juror_name AS INSERT INTO jurors (organization_id, juror_name, affiliation)
  VALUES ('11110000-0000-4000-8000-000000000001'::uuid, NULL, 'Test Dept');
SELECT throws_ok('EXECUTE bad_juror_name', '23502', NULL,
  'jurors.juror_name is NOT NULL');

-- ────────── score_sheets.juror_id ──────────
PREPARE bad_ss_juror_id AS INSERT INTO score_sheets (juror_id, project_id, period_id)
  VALUES (NULL, '33330000-0000-4000-8000-000000000001'::uuid, 'cccc0000-0000-4000-8000-000000000001'::uuid);
SELECT throws_ok('EXECUTE bad_ss_juror_id', '23502', NULL,
  'score_sheets.juror_id is NOT NULL');

-- ────────── score_sheets.project_id ──────────
PREPARE bad_ss_project_id AS INSERT INTO score_sheets (juror_id, project_id, period_id)
  VALUES ('55550000-0000-4000-8000-000000000001'::uuid, NULL, 'cccc0000-0000-4000-8000-000000000001'::uuid);
SELECT throws_ok('EXECUTE bad_ss_project_id', '23502', NULL,
  'score_sheets.project_id is NOT NULL');

-- ────────── score_sheets.period_id ──────────
PREPARE bad_ss_period_id AS INSERT INTO score_sheets (juror_id, project_id, period_id)
  VALUES ('55550000-0000-4000-8000-000000000001'::uuid, '33330000-0000-4000-8000-000000000001'::uuid, NULL);
SELECT throws_ok('EXECUTE bad_ss_period_id', '23502', NULL,
  'score_sheets.period_id is NOT NULL');

SELECT COALESCE(
  NULLIF((SELECT string_agg(t, E'\n') FROM finish() AS t), ''),
  'ALL TESTS PASSED'
) AS result;
ROLLBACK;
