-- RPC: rpc_admin_reopen_period_for_scoring(uuid) → jsonb
--
-- Pins the public contract:
--   * Signature: (p_period_id uuid) returning jsonb
--   * Unknown period           → RAISE 'period_not_found'
--   * Non-admin caller         → RAISE 'unauthorized'
--   * Period not closed yet    → { ok: false, error_code: 'period_not_closed' }
--   * Success                  → { ok: true, period_id, periodName }
--   * Side-effect: closed_at cleared, is_locked re-asserted to true
--   * Score sheets are NOT touched (lightweight reopen — distinct from
--     the destructive "Revert to Draft" approval path).

BEGIN;
SET LOCAL search_path = tap, public, extensions;
SELECT plan(8);

SELECT pgtap_test.seed_two_orgs();
SELECT pgtap_test.seed_periods();

-- ────────── 1. signature pinned ──────────
SELECT has_function(
  'public', 'rpc_admin_reopen_period_for_scoring',
  ARRAY['uuid'],
  'rpc_admin_reopen_period_for_scoring(uuid) exists'
);

SELECT function_returns(
  'public', 'rpc_admin_reopen_period_for_scoring',
  ARRAY['uuid'],
  'jsonb',
  'returns jsonb'
);

-- ────────── 2. unknown period → period_not_found ──────────
SELECT pgtap_test.become_a();

SELECT throws_ok(
  $c$SELECT rpc_admin_reopen_period_for_scoring('00000000-0000-4000-8000-000000000abc'::uuid)$c$,
  NULL::text,
  'period_not_found'::text,
  'unknown period → period_not_found'
);

-- ────────── 3. non-admin caller → unauthorized ──────────
-- The RPC calls _assert_org_admin which raises 'unauthorized' when the
-- caller is not an org admin for the period's org. Become anon to trigger.
SELECT pgtap_test.become_reset();

SELECT throws_ok(
  $c$SELECT rpc_admin_reopen_period_for_scoring('cccc0000-0000-4000-8000-000000000001'::uuid)$c$,
  NULL::text,
  'unauthorized'::text,
  'non-org-admin caller → unauthorized'
);

-- ────────── 4. period not closed → error_code: period_not_closed ──────────
SELECT pgtap_test.become_a();

SELECT is(
  (rpc_admin_reopen_period_for_scoring('cccc0000-0000-4000-8000-000000000001'::uuid)->>'error_code'),
  'period_not_closed',
  'open period (closed_at IS NULL) → error_code: period_not_closed'
);

-- ────────── 5. success: closed period reopens ──────────
-- Seed periods are unlocked/locked but none are closed. Close the first
-- locked period so we can reopen it.
SELECT pgtap_test.become_reset();
UPDATE periods SET closed_at = now()
  WHERE id = 'cccc0000-0000-4000-8000-000000000011'::uuid;

SELECT pgtap_test.become_a();

SELECT ok(
  (rpc_admin_reopen_period_for_scoring('cccc0000-0000-4000-8000-000000000011'::uuid)->>'ok')::boolean,
  'closed period reopens → ok: true'
);

-- ────────── 6. side-effect: closed_at cleared and is_locked stays true ──────────
SELECT is(
  (SELECT closed_at FROM periods WHERE id = 'cccc0000-0000-4000-8000-000000000011'::uuid),
  NULL::timestamptz,
  'reopen clears closed_at'
);

SELECT is(
  (SELECT is_locked FROM periods WHERE id = 'cccc0000-0000-4000-8000-000000000011'::uuid),
  true,
  'reopen leaves is_locked = true (structure stays read-only)'
);

SELECT pgtap_test.become_reset();
SELECT COALESCE(
  NULLIF((SELECT string_agg(t, E'\n') FROM finish() AS t), ''),
  'ALL TESTS PASSED'
) AS result;
ROLLBACK;
