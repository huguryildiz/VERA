-- RPC: rpc_admin_mark_setup_complete(p_org_id uuid) → timestamptz
--
-- Contract (006a_rpcs_admin.sql):
--   * NULL org_id       → 'org_id_required'
--   * Non-member caller → 'unauthorized'
--   * Unknown org_id    → 'org_not_found'
--   * Member caller     → stamps setup_completed_at once, returns ts

BEGIN;
SET LOCAL search_path = tap, public, extensions;
SELECT plan(4);

SELECT pgtap_test.seed_two_orgs();

-- ────────── 1. NULL org id ──────────
SELECT pgtap_test.become_a();
SELECT throws_ok(
  $c$SELECT rpc_admin_mark_setup_complete(NULL::uuid)$c$,
  NULL::text,
  'org_id_required'::text,
  'NULL org_id → error org_id_required'::text
);

-- ────────── 2. non-member caller is rejected ──────────
SELECT throws_ok(
  $c$SELECT rpc_admin_mark_setup_complete('22220000-0000-4000-8000-000000000002'::uuid)$c$,
  NULL::text,
  'unauthorized'::text,
  'admin A cannot mark setup complete for org B'::text
);

-- ────────── 3. happy path: stamps setup_completed_at ──────────
SELECT isnt(
  (SELECT rpc_admin_mark_setup_complete(
     '11110000-0000-4000-8000-000000000001'::uuid
   )::text),
  NULL::text,
  'admin A receives timestamp for own org'::text
);

-- ────────── 4. setup_completed_at persisted on organizations row ──────────
SELECT pgtap_test.become_reset();
SELECT isnt(
  (SELECT setup_completed_at::text FROM organizations
   WHERE id = '11110000-0000-4000-8000-000000000001'::uuid),
  NULL::text,
  'organizations.setup_completed_at is set after RPC succeeds'::text
);

SELECT COALESCE(
  NULLIF((SELECT string_agg(t, E'\n') FROM finish() AS t), ''),
  'ALL TESTS PASSED'
) AS result;
ROLLBACK;
