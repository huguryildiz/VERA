-- RPC: rpc_admin_list_organizations() → json
--
-- Contract (006a_rpcs_admin.sql):
--   * Caller is not super_admin → RAISE EXCEPTION 'unauthorized'
--   * Caller is super_admin      → returns JSON array of all orgs

BEGIN;
SET LOCAL search_path = tap, public, extensions;
SELECT plan(2);

SELECT pgtap_test.seed_two_orgs();

-- ────────── 1. org_admin is blocked ──────────
SELECT pgtap_test.become_a();
SELECT throws_ok(
  $call$SELECT rpc_admin_list_organizations()$call$,
  NULL::text,
  'unauthorized'::text,
  'org_admin cannot call rpc_admin_list_organizations'::text
);

-- ────────── 2. super_admin gets a JSON result ──────────
SELECT pgtap_test.become_reset();
SELECT pgtap_test.become_super();

SELECT isnt(
  (SELECT rpc_admin_list_organizations()::text),
  NULL::text,
  'super_admin receives a JSON payload'::text
);

SELECT pgtap_test.become_reset();
SELECT COALESCE(
  NULLIF((SELECT string_agg(t, E'\n') FROM finish() AS t), ''),
  'ALL TESTS PASSED'
) AS result;
ROLLBACK;
