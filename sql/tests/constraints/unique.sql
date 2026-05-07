-- pgTAP: UNIQUE constraint enforcement
-- Tests that critical UNIQUE constraints reject duplicate inserts with SQLSTATE 23505.
--
-- Constraints tested:
--   period_criteria(period_id, key) UNIQUE
--   score_sheets(juror_id, project_id) UNIQUE
--   score_sheet_items(score_sheet_id, period_criterion_id) UNIQUE
--   juror_period_auth(juror_id, period_id) PRIMARY KEY (composite)
--   entry_tokens(token_hash) UNIQUE

BEGIN;
SET LOCAL search_path = tap, public, extensions;
SELECT plan(5);

SELECT pgtap_test.seed_two_orgs();
SELECT pgtap_test.seed_periods();
SELECT pgtap_test.seed_projects();
SELECT pgtap_test.seed_jurors();
SELECT pgtap_test.seed_entry_tokens();

-- ────────── period_criteria(period_id, key) UNIQUE ──────────
-- Insert first criterion
INSERT INTO period_criteria (period_id, key, label, max_score, weight)
  VALUES ('cccc0000-0000-4000-8000-000000000001'::uuid, 'unique-test-key', 'Test Criterion', 10, 1);

-- Attempt duplicate key in same period
PREPARE bad_pc_duplicate_key AS INSERT INTO period_criteria (period_id, key, label, max_score, weight)
  VALUES ('cccc0000-0000-4000-8000-000000000001'::uuid, 'unique-test-key', 'Another Label', 10, 1);
SELECT throws_ok('EXECUTE bad_pc_duplicate_key', '23505', NULL,
  'period_criteria(period_id, key) UNIQUE prevents duplicate key in same period');

-- ────────── score_sheets(juror_id, project_id) UNIQUE ──────────
-- Insert first score sheet
INSERT INTO score_sheets (juror_id, project_id, period_id)
  VALUES ('55550000-0000-4000-8000-000000000001'::uuid, '33330000-0000-4000-8000-000000000001'::uuid, 'cccc0000-0000-4000-8000-000000000001'::uuid);

-- Attempt duplicate juror×project
PREPARE bad_ss_duplicate AS INSERT INTO score_sheets (juror_id, project_id, period_id)
  VALUES ('55550000-0000-4000-8000-000000000001'::uuid, '33330000-0000-4000-8000-000000000001'::uuid, 'cccc0000-0000-4000-8000-000000000001'::uuid);
SELECT throws_ok('EXECUTE bad_ss_duplicate', '23505', NULL,
  'score_sheets(juror_id, project_id) UNIQUE prevents duplicate juror×project');

-- ────────── score_sheet_items(score_sheet_id, period_criterion_id) UNIQUE ──────────
-- Get the score_sheet_id and period_criterion_id we just created
-- Add an item to the score sheet
INSERT INTO score_sheet_items (score_sheet_id, period_criterion_id, score_value)
  SELECT
    (SELECT id FROM score_sheets WHERE juror_id = '55550000-0000-4000-8000-000000000001'::uuid AND project_id = '33330000-0000-4000-8000-000000000001'::uuid LIMIT 1),
    (SELECT id FROM period_criteria WHERE period_id = 'cccc0000-0000-4000-8000-000000000001'::uuid AND key = 'unique-test-key' LIMIT 1),
    7.5;

-- Attempt duplicate score_sheet_id×criterion
PREPARE bad_ssi_duplicate AS INSERT INTO score_sheet_items (score_sheet_id, period_criterion_id, score_value)
  SELECT
    (SELECT id FROM score_sheets WHERE juror_id = '55550000-0000-4000-8000-000000000001'::uuid AND project_id = '33330000-0000-4000-8000-000000000001'::uuid LIMIT 1),
    (SELECT id FROM period_criteria WHERE period_id = 'cccc0000-0000-4000-8000-000000000001'::uuid AND key = 'unique-test-key' LIMIT 1),
    8.5;
SELECT throws_ok('EXECUTE bad_ssi_duplicate', '23505', NULL,
  'score_sheet_items(score_sheet_id, period_criterion_id) UNIQUE prevents duplicate criterion score');

-- ────────── juror_period_auth(juror_id, period_id) PRIMARY KEY ──────────
-- Insert first auth row
INSERT INTO juror_period_auth (juror_id, period_id)
  VALUES ('55550000-0000-4000-8000-000000000001'::uuid, 'cccc0000-0000-4000-8000-000000000001'::uuid);

-- Attempt duplicate (juror, period) pair
PREPARE bad_jpa_duplicate AS INSERT INTO juror_period_auth (juror_id, period_id)
  VALUES ('55550000-0000-4000-8000-000000000001'::uuid, 'cccc0000-0000-4000-8000-000000000001'::uuid);
SELECT throws_ok('EXECUTE bad_jpa_duplicate', '23505', NULL,
  'juror_period_auth(juror_id, period_id) PRIMARY KEY prevents duplicate auth row');

-- ────────── entry_tokens(token_hash) UNIQUE ──────────
-- The seed already inserted two tokens with different hashes. Try to insert with
-- the same hash as an existing token.
PREPARE bad_token_duplicate AS INSERT INTO entry_tokens (period_id, token_hash, is_revoked)
  VALUES ('cccc0000-0000-4000-8000-000000000001'::uuid,
          encode(digest('pgtap-token-a', 'sha256'), 'hex'),
          false);
SELECT throws_ok('EXECUTE bad_token_duplicate', '23505', NULL,
  'entry_tokens(token_hash) UNIQUE prevents duplicate token hash');

SELECT COALESCE(
  NULLIF((SELECT string_agg(t, E'\n') FROM finish() AS t), ''),
  'ALL TESTS PASSED'
) AS result;
ROLLBACK;
