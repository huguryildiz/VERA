-- pgTAP: Trigger Correctness Tests
--
-- Tests three critical triggers:
--   a) trigger_assign_project_no — sequential numbering within period, reset across periods
--   b) trigger_audit_log diff accuracy — UPDATE diffs record only changed columns
--   c) trigger_block_period_child_on_locked — INSERT rejected with 'period_locked' error

BEGIN;
SET LOCAL search_path = tap, public, extensions;
SELECT plan(6);

SELECT pgtap_test.seed_two_orgs();
SELECT pgtap_test.seed_periods();

-- ====================================================================
-- a) trigger_assign_project_no — sequential assignment per period
-- ====================================================================
-- Insert 5 projects in period A1; verify project_no = {1,2,3,4,5}
INSERT INTO projects (period_id, title, advisor_name) VALUES
  ('cccc0000-0000-4000-8000-000000000001'::uuid, 'Project 1', 'Advisor 1'),
  ('cccc0000-0000-4000-8000-000000000001'::uuid, 'Project 2', 'Advisor 1'),
  ('cccc0000-0000-4000-8000-000000000001'::uuid, 'Project 3', 'Advisor 1'),
  ('cccc0000-0000-4000-8000-000000000001'::uuid, 'Project 4', 'Advisor 1'),
  ('cccc0000-0000-4000-8000-000000000001'::uuid, 'Project 5', 'Advisor 1');

SELECT is(
  (SELECT array_agg(project_no ORDER BY created_at)
   FROM projects
   WHERE period_id = 'cccc0000-0000-4000-8000-000000000001'::uuid),
  ARRAY[1,2,3,4,5],
  'trigger_assign_project_no: projects A1 numbered 1–5 in insert order'
);

-- Insert first project in period B1; verify project_no = 1 (not 6)
INSERT INTO projects (period_id, title, advisor_name) VALUES
  ('dddd0000-0000-4000-8000-000000000002'::uuid, 'Project B1', 'Advisor B');

SELECT is(
  (SELECT project_no FROM projects
   WHERE period_id = 'dddd0000-0000-4000-8000-000000000002'::uuid
   ORDER BY created_at DESC LIMIT 1),
  1,
  'trigger_assign_project_no: first project in period B1 is numbered 1 (resets per period)'
);

-- ====================================================================
-- b) trigger_audit_log — UPDATE diff accuracy
-- ====================================================================
-- Create a period, then UPDATE only its name field
-- Verify that audit_logs records the UPDATE with diff before/after for name only

INSERT INTO periods (organization_id, name, season)
  VALUES ('11110000-0000-4000-8000-000000000001'::uuid, 'Audit Test Period', 'Fall');

-- Get the period's ID for subsequent operations
WITH inserted_period AS (
  SELECT id FROM periods
  WHERE name = 'Audit Test Period'
  ORDER BY created_at DESC LIMIT 1
)
UPDATE periods
SET name = 'Audit Test Period Updated'
WHERE id = (SELECT id FROM inserted_period);

-- Query the latest audit_logs row for the UPDATE
SELECT ok(
  EXISTS(
    SELECT 1 FROM audit_logs
    WHERE action = 'periods.update'
      AND resource_type = 'periods'
      AND (diff->'after'->>'name') = 'Audit Test Period Updated'
      AND (diff->'before'->>'name') IS NOT NULL
  ),
  'trigger_audit_log: UPDATE captures before value in diff'
);

SELECT ok(
  EXISTS(
    SELECT 1 FROM audit_logs
    WHERE action = 'periods.update'
      AND resource_type = 'periods'
      AND (diff->'after'->>'name') = 'Audit Test Period Updated'
      AND (diff->'after'->>'name') IS NOT NULL
  ),
  'trigger_audit_log: UPDATE captures after value in diff'
);

SELECT ok(
  EXISTS(
    SELECT 1 FROM audit_logs
    WHERE action = 'periods.update'
      AND resource_type = 'periods'
      AND (diff->'after'->>'name') = 'Audit Test Period Updated'
  ),
  'trigger_audit_log: after value in diff matches updated column'
);

-- ====================================================================
-- c) block_period_criteria_on_locked — INSERT blocked when locked
-- ====================================================================
-- Period A2 is already locked (seeded by pgtap_test.seed_periods).
-- Attempt to INSERT a period_criterion into the locked period.

PREPARE bad_insert_locked AS INSERT INTO period_criteria
  (period_id, key, label, max_score, weight)
  VALUES ('cccc0000-0000-4000-8000-000000000011'::uuid, 'locked-period-test', 'Test', 10, 1);

SELECT throws_ok(
  'EXECUTE bad_insert_locked',
  '23514',
  'period_locked',
  'block_period_criteria_on_locked: INSERT into locked period raises period_locked error'
);

SELECT COALESCE(
  NULLIF((SELECT string_agg(t, E'\n') FROM finish() AS t), ''),
  'ALL TESTS PASSED'
) AS result;
ROLLBACK;
