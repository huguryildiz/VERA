-- RPC: rpc_jury_verify_pin(period_id, name, affiliation, pin) → json
--
-- Contract:
--   * Wrong PIN → { ok: false, error_code: 'invalid_pin', failed_attempts++ }
--   * Correct PIN → { ok: true, session_token, juror_id } + DB: session_token_hash set
--   * Unknown juror → { ok: false, error_code: 'juror_not_found' }

BEGIN;
SET LOCAL search_path = tap, public, extensions;
SELECT plan(5);

SELECT pgtap_test.seed_two_orgs();
SELECT pgtap_test.seed_periods();

-- Drive via rpc_jury_authenticate to capture a real minted PIN, then verify.
-- We stash the PIN in a temp table so the subsequent verify_pin calls can
-- reference it without re-minting (force_reissue=false on repeat auth).
CREATE TEMP TABLE _pgtap_pin (pin text) ON COMMIT DROP;

INSERT INTO _pgtap_pin (pin)
SELECT rpc_jury_authenticate(
  'cccc0000-0000-4000-8000-000000000001'::uuid,
  'pgtap Juror Verify', 'pgtap dept', false, NULL
)->>'pin_plain_once';

-- ────────── 1. juror_not_found path ──────────
SELECT is(
  (SELECT rpc_jury_verify_pin(
     'cccc0000-0000-4000-8000-000000000001'::uuid,
     'pgtap No Such Juror', 'pgtap dept', '0000'
   )->>'error_code'),
  'juror_not_found'::text,
  'unknown juror → error_code=juror_not_found'::text
);

-- ────────── 2. wrong PIN path ──────────
SELECT is(
  (SELECT rpc_jury_verify_pin(
     'cccc0000-0000-4000-8000-000000000001'::uuid,
     'pgtap Juror Verify', 'pgtap dept', '0000'
   )->>'error_code'),
  'invalid_pin'::text,
  'wrong PIN → error_code=invalid_pin'::text
);

-- ────────── 3. failed_attempts counter incremented ──────────
SELECT cmp_ok(
  (SELECT failed_attempts FROM juror_period_auth
   WHERE period_id = 'cccc0000-0000-4000-8000-000000000001'::uuid
     AND juror_id IN (SELECT id FROM jurors WHERE juror_name = 'pgtap Juror Verify')),
  '>='::text,
  1,
  'failed_attempts incremented after bad PIN'::text
);

-- ────────── 4. correct PIN issues session_token ──────────
SELECT isnt(
  (SELECT rpc_jury_verify_pin(
     'cccc0000-0000-4000-8000-000000000001'::uuid,
     'pgtap Juror Verify', 'pgtap dept',
     (SELECT pin FROM _pgtap_pin LIMIT 1)
   )->>'session_token'),
  NULL::text,
  'correct PIN returns session_token'::text
);

-- ────────── 5. session_token_hash persisted on juror_period_auth ──────────
SELECT isnt(
  (SELECT session_token_hash FROM juror_period_auth
   WHERE period_id = 'cccc0000-0000-4000-8000-000000000001'::uuid
     AND juror_id IN (SELECT id FROM jurors WHERE juror_name = 'pgtap Juror Verify')),
  NULL::text,
  'session_token_hash stored on juror_period_auth after successful verify'::text
);

SELECT COALESCE(
  NULLIF((SELECT string_agg(t, E'\n') FROM finish() AS t), ''),
  'ALL TESTS PASSED'
) AS result;
ROLLBACK;
