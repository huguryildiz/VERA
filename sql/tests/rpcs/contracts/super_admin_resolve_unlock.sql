-- RPC: rpc_super_admin_resolve_unlock(UUID, TEXT, TEXT) → json
--
-- Pins the public contract:
--   * Signature: (p_request_id UUID, p_decision TEXT, p_note TEXT DEFAULT NULL) returning json
--   * Super-admin required (returns {ok:false, error_code:'unauthorized'} otherwise)
--   * Approves or rejects unlock requests
--   * Error codes: 'unauthorized', 'invalid_decision', 'request_not_found'
--   * Returns {ok, request_id, decision}

BEGIN;
SET LOCAL search_path = tap, public, extensions;
SELECT plan(9);

-- ────────── 1. signature pinned ──────────
SELECT has_function(
  'public', 'rpc_super_admin_resolve_unlock',
  ARRAY['uuid'::text, 'text'::text, 'text'::text],
  'rpc_super_admin_resolve_unlock(uuid, text, text) exists'
);

SELECT function_returns(
  'public', 'rpc_super_admin_resolve_unlock',
  ARRAY['uuid'::text, 'text'::text, 'text'::text],
  'json',
  'returns json'
);

-- ────────── 2. org-admin → unauthorized ──────────
SELECT pgtap_test.seed_two_orgs();
SELECT pgtap_test.become_a();

SELECT results_eq(
  $c$SELECT (rpc_super_admin_resolve_unlock('00000000-0000-0000-0000-000000009999'::uuid, 'approved', NULL)::jsonb ->> 'error_code')$c$,
  ARRAY['unauthorized'],
  'org-admin gets unauthorized error code'
);

-- ────────── 3. unauthenticated → unauthorized ──────────
SELECT pgtap_test.become_reset();

SELECT results_eq(
  $c$SELECT (rpc_super_admin_resolve_unlock('00000000-0000-0000-0000-000000009999'::uuid, 'approved', NULL)::jsonb ->> 'error_code')$c$,
  ARRAY['unauthorized'],
  'unauthenticated gets unauthorized error code'
);

-- ────────── seed data before switching to super role ──────────
SELECT pgtap_test.seed_two_orgs();
SELECT pgtap_test.seed_periods();
SELECT pgtap_test.seed_unlock_requests();
SELECT pgtap_test.seed_jurors();

-- Seed a project + score_sheet under each locked period so we can verify the
-- approved-revert score-purge side-effect (and confirm rejection leaves
-- scores intact). seed_projects() only attaches projects to the unlocked
-- periods, so we insert directly here. The period_lock trigger blocks
-- inserts on locked periods, so we briefly unlock and re-lock around the
-- seed; this matches the real-world history (scoring happened before lock).
UPDATE periods SET is_locked = false
  WHERE id IN ('cccc0000-0000-4000-8000-000000000011'::uuid,
               'dddd0000-0000-4000-8000-000000000022'::uuid);

INSERT INTO projects (id, period_id, title, advisor_name) VALUES
  ('33330000-0000-4000-8000-000000000a11'::uuid,
   'cccc0000-0000-4000-8000-000000000011'::uuid, 'pgtap Project A-locked', 'Advisor A'),
  ('44440000-0000-4000-8000-000000000b22'::uuid,
   'dddd0000-0000-4000-8000-000000000022'::uuid, 'pgtap Project B-locked', 'Advisor B')
ON CONFLICT (id) DO NOTHING;

INSERT INTO score_sheets (id, period_id, project_id, juror_id) VALUES
  ('a55a0000-0000-4000-8000-000000000a11'::uuid,
   'cccc0000-0000-4000-8000-000000000011'::uuid,
   '33330000-0000-4000-8000-000000000a11'::uuid,
   '55550000-0000-4000-8000-000000000001'::uuid),
  ('a55a0000-0000-4000-8000-000000000b22'::uuid,
   'dddd0000-0000-4000-8000-000000000022'::uuid,
   '44440000-0000-4000-8000-000000000b22'::uuid,
   '66660000-0000-4000-8000-000000000002'::uuid)
ON CONFLICT (id) DO NOTHING;

UPDATE periods SET is_locked = true
  WHERE id IN ('cccc0000-0000-4000-8000-000000000011'::uuid,
               'dddd0000-0000-4000-8000-000000000022'::uuid);

SELECT pgtap_test.become_super();

-- ────────── 4. super-admin can approve unlock request ──────────
-- This consumes the seeded pending request for Org A locked period (cccc...0011).
SELECT lives_ok(
  $c$SELECT rpc_super_admin_resolve_unlock('a3330000-0000-4000-8000-000000000a11'::uuid, 'approved', NULL)$c$,
  'super-admin can approve unlock request'
);

-- ────────── 4b. approved revert purges score_sheets for the period ──────────
-- Pins the destructive side-effect surfaced to the super admin via
-- score_count: approving must leave zero score_sheets behind for the period.
SELECT is(
  (SELECT COUNT(*)::INT FROM score_sheets ss
   JOIN projects pr ON pr.id = ss.project_id
   WHERE pr.period_id = 'cccc0000-0000-4000-8000-000000000011'::uuid),
  0,
  'approve deletes all score_sheets for the period'
);

-- ────────── 5. super-admin can reject unlock request ──────────
-- This consumes the seeded pending request for Org B locked period (dddd...0022).
SELECT lives_ok(
  $c$SELECT rpc_super_admin_resolve_unlock('a3330000-0000-4000-8000-000000000b22'::uuid, 'rejected', NULL)$c$,
  'super-admin can reject unlock request'
);

-- ────────── 5b. rejected revert leaves score_sheets intact ──────────
-- Control: only approval should purge scores. A rejected request must not
-- touch them so the period can keep being scored.
SELECT is(
  (SELECT COUNT(*)::INT FROM score_sheets ss
   JOIN projects pr ON pr.id = ss.project_id
   WHERE pr.period_id = 'dddd0000-0000-4000-8000-000000000022'::uuid),
  1,
  'reject preserves score_sheets for the period'
);

-- Insert the shape-check request AFTER steps 4 and 5 have consumed the seeded
-- pending requests. idx_unlock_requests_one_pending_per_period allows only one
-- pending row per period; inserting before step 4 would violate it.
SELECT pgtap_test.become_reset();
INSERT INTO unlock_requests (id, organization_id, period_id, requested_by, reason, status, created_at)
VALUES (
  '99990000-0000-0000-0000-000000000099'::uuid,
  '11110000-0000-4000-8000-000000000001'::uuid,
  'cccc0000-0000-4000-8000-000000000011'::uuid,
  'aaaa0000-0000-4000-8000-000000000001'::uuid,
  'test unlock for shape check',
  'pending',
  now()
);
SELECT pgtap_test.become_super();

-- ────────── 6. response has ok, request_id, decision ──────────
SELECT ok(
  (SELECT (r ? 'ok') AND (r ? 'request_id') AND (r ? 'decision')
   FROM (SELECT rpc_super_admin_resolve_unlock('99990000-0000-0000-0000-000000000099'::uuid, 'approved', NULL)::jsonb AS r) t),
  'response has ok, request_id, decision keys'
);

SELECT pgtap_test.become_reset();
SELECT COALESCE(
  NULLIF((SELECT string_agg(t, E'\n') FROM finish() AS t), ''),
  'ALL TESTS PASSED'
) AS result;
ROLLBACK;
