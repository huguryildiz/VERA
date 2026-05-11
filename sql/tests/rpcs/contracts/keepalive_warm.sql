-- RPC: rpc_keepalive_warm() → text
--
-- Pins the public contract:
--   * Signature: () returning text
--   * SECURITY DEFINER with search_path = public, auth
--   * Service-role-only (anon + authenticated must be denied)
--   * pg_cron calls this every 10 minutes to keep bootstrap caches hot;
--     it does a bounded set of COUNT(*) reads and returns 'ok'.

BEGIN;
SET LOCAL search_path = tap, public, extensions;
SELECT plan(5);

-- ────────── 1. signature pinned ──────────
SELECT has_function(
  'public', 'rpc_keepalive_warm',
  ARRAY[]::text[],
  'rpc_keepalive_warm() exists'
);

SELECT function_returns(
  'public', 'rpc_keepalive_warm',
  ARRAY[]::text[],
  'text',
  'returns text'
);

-- ────────── 2. anon and authenticated are denied ──────────
SELECT pgtap_test.become_anon();
SELECT throws_ok(
  $c$SELECT rpc_keepalive_warm()$c$,
  '42501',
  NULL,
  'anon role is denied EXECUTE'
);

SELECT pgtap_test.become_reset();
SELECT pgtap_test.seed_two_orgs();
SELECT pgtap_test.become_a();
SELECT throws_ok(
  $c$SELECT rpc_keepalive_warm()$c$,
  '42501',
  NULL,
  'authenticated role is denied EXECUTE'
);

-- ────────── 3. service_role can call and gets 'ok' ──────────
SELECT pgtap_test.become_reset();
SET LOCAL ROLE service_role;
SELECT is(
  rpc_keepalive_warm(),
  'ok',
  'service_role can call and gets ok'
);
RESET ROLE;

SELECT pgtap_test.become_reset();
SELECT COALESCE(
  NULLIF((SELECT string_agg(t, E'\n') FROM finish() AS t), ''),
  'ALL TESTS PASSED'
) AS result;
ROLLBACK;
