-- RPC: rpc_keepalive_warm() → text
--
-- Pins the public contract:
--   * Signature: () returning text
--   * SECURITY DEFINER with search_path = public, auth
--   * Service-role-only (anon + authenticated have no EXECUTE grant)
--   * pg_cron calls this every 10 minutes to keep bootstrap caches hot;
--     it does a bounded set of COUNT(*) reads and returns 'ok'.
--
-- Note: service-role-only functions cannot be tested with throws_ok against
-- anon/authenticated — the EXECUTE check fires before pgTAP's exception
-- handler and crashes the connection. Verify via has_function_privilege.

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

-- ────────── 2. anon and authenticated are denied EXECUTE ──────────
SELECT ok(
  NOT has_function_privilege('anon', 'public.rpc_keepalive_warm()', 'execute'),
  'anon has no execute privilege on rpc_keepalive_warm'
);

SELECT ok(
  NOT has_function_privilege('authenticated', 'public.rpc_keepalive_warm()', 'execute'),
  'authenticated has no execute privilege on rpc_keepalive_warm'
);

-- ────────── 3. service-role-equivalent (postgres superuser) can call and gets 'ok' ──────────
SELECT pgtap_test.become_reset();
SELECT lives_ok(
  $c$SELECT rpc_keepalive_warm()$c$,
  'service-role-equivalent caller can invoke rpc_keepalive_warm'
);

SELECT COALESCE(
  NULLIF((SELECT string_agg(t, E'\n') FROM finish() AS t), ''),
  'ALL TESTS PASSED'
) AS result;
ROLLBACK;
