-- RPC: rpc_admin_bootstrap(uuid, uuid) → json
--
-- Pins the public contract for the bundled admin bootstrap RPC.
--   * Signature: (p_preferred_organization_id uuid, p_default_period_id uuid) returning json
--   * No JWT claims       → {ok: false, error_code: "unauthenticated"}
--   * Normal admin        → payload has all 5 top-level keys; memberships non-empty
--   * Cross-tenant arg    → inaccessible preferred_org ignored; falls back to accessible org
--   * Super admin         → organizations includes all active orgs (≥ 2)
--   * Periods scoped      → returned periods all belong to the preferred org
--   * Org with no periods → default_period_id null, periods []
BEGIN;
SET LOCAL search_path = tap, public, extensions;
SELECT plan(10);

SELECT pgtap_test.seed_two_orgs();
SELECT pgtap_test.seed_periods();

-- seed org_c (no periods) for null-default assertions
INSERT INTO organizations (id, code, name)
VALUES ('33330000-0000-4000-8000-000000000003'::uuid, 'pgtap-org-c', 'pgtap Org C')
ON CONFLICT (id) DO NOTHING;

INSERT INTO memberships (user_id, organization_id, role, status, is_owner)
VALUES ('aaaa0000-0000-4000-8000-000000000001'::uuid,
        '33330000-0000-4000-8000-000000000003'::uuid, 'org_admin', 'active', false)
ON CONFLICT (user_id, organization_id) DO NOTHING;

-- 1. signature
SELECT has_function('public', 'rpc_admin_bootstrap', ARRAY['uuid','uuid'], 'fn exists');

-- 2. return type
SELECT function_returns('public', 'rpc_admin_bootstrap', ARRAY['uuid','uuid'], 'json', 'returns json');

-- 3. no jwt → unauthenticated (postgres role, no jwt.claims set)
SELECT is(
  (SELECT (rpc_admin_bootstrap())::jsonb->>'error_code'),
  'unauthenticated',
  'no jwt → unauthenticated error_code'
);

-- 4-7: admin A context
SELECT pgtap_test.become_a();

-- 4. payload has all 5 expected top-level keys
SELECT ok(
  (SELECT (rpc_admin_bootstrap())::jsonb
    ?& ARRAY['memberships','organizations','preferred_organization_id','periods','default_period_id']),
  'admin A: payload has all 5 expected top-level keys'
);

-- 5. memberships array is non-empty
SELECT ok(
  (SELECT jsonb_array_length((rpc_admin_bootstrap())::jsonb->'memberships') >= 1),
  'admin A: memberships non-empty'
);

-- 6. cross-tenant: inaccessible org_b supplied → preferred falls back to accessible org_a
SELECT is(
  (SELECT ((rpc_admin_bootstrap(
      '22220000-0000-4000-8000-000000000002'::uuid, NULL
    ))::jsonb->>'preferred_organization_id')::uuid),
  '11110000-0000-4000-8000-000000000001'::uuid,
  'cross-tenant: preferred_org falls back to accessible org when inaccessible id supplied'
);

-- 7. all returned periods belong to the preferred org (org A)
SELECT is(
  (SELECT bool_and((p->>'organization_id') = '11110000-0000-4000-8000-000000000001')
   FROM jsonb_array_elements((rpc_admin_bootstrap())::jsonb->'periods') AS p),
  true,
  'admin A: all periods belong to preferred org'
);

-- 8: super admin context
SELECT pgtap_test.become_super();

-- 8. super admin organizations array length ≥ 2
SELECT ok(
  (SELECT jsonb_array_length((rpc_admin_bootstrap())::jsonb->'organizations') >= 2),
  'super admin: organizations array length ≥ 2'
);

-- 9-10: org with no periods (org_c), back to admin A
SELECT pgtap_test.become_a();

-- 9. default_period_id is null when preferred org has no periods
SELECT is(
  (SELECT (rpc_admin_bootstrap(
      '33330000-0000-4000-8000-000000000003'::uuid, NULL
    ))::jsonb->>'default_period_id'),
  NULL::text,
  'org with no periods → default_period_id is null'
);

-- 10. periods array is empty when preferred org has no periods
SELECT is(
  (SELECT (rpc_admin_bootstrap(
      '33330000-0000-4000-8000-000000000003'::uuid, NULL
    ))::jsonb->'periods'),
  '[]'::jsonb,
  'org with no periods → periods is empty array'
);

SELECT * FROM finish();
ROLLBACK;
