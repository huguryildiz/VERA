-- RPC: rpc_jury_validate_entry_token(p_token text) → json
--
-- Contract:
--   { ok: false, error_code: 'token_not_found' }  -- hash miss
--   { ok: false, error_code: 'token_revoked' }    -- is_revoked = true
--   { ok: false, error_code: 'token_expired' }    -- expires_at < now
--   { ok: true, period_id, is_locked, ... }       -- happy path

BEGIN;
SET LOCAL search_path = tap, public, extensions;
SELECT plan(4);

SELECT pgtap_test.seed_two_orgs();
SELECT pgtap_test.seed_periods();
SELECT pgtap_test.seed_entry_tokens();

-- Also seed a revoked token on the same period.
INSERT INTO entry_tokens (id, period_id, token_hash, token_plain, is_revoked, expires_at)
VALUES (
  '77770000-0000-4000-8000-0000000000aa'::uuid,
  'cccc0000-0000-4000-8000-000000000001'::uuid,
  encode(digest('pgtap-token-revoked', 'sha256'), 'hex'),
  'pgtap-token-revoked', true, now() + interval '1 day'
) ON CONFLICT (id) DO NOTHING;

-- ────────── 1. token_not_found ──────────
SELECT is(
  (SELECT rpc_jury_validate_entry_token('pgtap-nonexistent-token'::text)->>'error_code'),
  'token_not_found'::text,
  'unknown token returns token_not_found'::text
);

-- ────────── 2. revoked token ──────────
SELECT is(
  (SELECT rpc_jury_validate_entry_token('pgtap-token-revoked'::text)->>'error_code'),
  'token_revoked'::text,
  'revoked token returns token_revoked'::text
);

-- ────────── 3. happy path: valid token returns period_id ──────────
SELECT is(
  (SELECT (rpc_jury_validate_entry_token('pgtap-token-a'::text)->>'period_id')::uuid),
  'cccc0000-0000-4000-8000-000000000001'::uuid,
  'valid token returns matching period_id'::text
);

-- ────────── 4. happy path: ok=true ──────────
SELECT is(
  (SELECT (rpc_jury_validate_entry_token('pgtap-token-a'::text)->>'ok')::boolean),
  true,
  'valid token returns ok=true'::text
);

SELECT COALESCE(
  NULLIF((SELECT string_agg(t, E'\n') FROM finish() AS t), ''),
  'ALL TESTS PASSED'
) AS result;
ROLLBACK;
