-- RPC: rpc_org_admin_list_members() → jsonb
--
-- Contract (006b_rpcs_admin.sql):
--   * Caller with no active membership → 'unauthorized'
--   * Returns only members of caller's own org
--   * Payload shape:
--       { members: [ { id, user_id, status, display_name, email,
--                      is_owner, is_you, ... } ],
--         admins_can_invite: boolean }

BEGIN;
SET LOCAL search_path = tap, public, extensions;
SELECT plan(4);

SELECT pgtap_test.seed_two_orgs();

-- Add a second member to org A so we can assert the list has 2 rows for A.
INSERT INTO auth.users (id, instance_id, aud, role, email) VALUES
  ('aaaa0000-0000-4000-8000-00000000000f'::uuid,
   '00000000-0000-0000-0000-000000000000'::uuid,
   'authenticated', 'authenticated', 'pgtap_admin_a2@test.local')
ON CONFLICT (id) DO NOTHING;
INSERT INTO profiles (id, display_name) VALUES
  ('aaaa0000-0000-4000-8000-00000000000f'::uuid, 'pgtap Admin A2')
ON CONFLICT (id) DO NOTHING;
INSERT INTO memberships (user_id, organization_id, role, status) VALUES
  ('aaaa0000-0000-4000-8000-00000000000f'::uuid,
   '11110000-0000-4000-8000-000000000001'::uuid, 'org_admin', 'active')
ON CONFLICT (user_id, organization_id) DO NOTHING;

-- ────────── 1. admin A sees exactly their org members ──────────
SELECT pgtap_test.become_a();

SELECT is(
  (SELECT jsonb_array_length(
     (rpc_org_admin_list_members()->'members')
   )),
  2,
  'admin A sees both active members of org A'::text
);

-- ────────── 2. payload marks the caller with is_you=true ──────────
SELECT is(
  (SELECT bool_or((m->>'is_you')::boolean)
   FROM jsonb_array_elements(rpc_org_admin_list_members()->'members') AS m
   WHERE (m->>'user_id')::uuid = 'aaaa0000-0000-4000-8000-000000000001'::uuid),
  true,
  'caller row is flagged with is_you=true'::text
);

-- ────────── 3. admin A does NOT see admin B (org B) ──────────
SELECT is(
  (SELECT bool_or(
     (m->>'user_id')::uuid = 'bbbb0000-0000-4000-8000-000000000002'::uuid
   )
   FROM jsonb_array_elements(rpc_org_admin_list_members()->'members') AS m),
  false,
  'admin A does NOT see admin B in member list'::text
);

-- ────────── 4. super_admin (no tenant) → unauthorized ──────────
SELECT pgtap_test.become_reset();
SELECT pgtap_test.become_super();

SELECT throws_ok(
  $c$SELECT rpc_org_admin_list_members()$c$,
  NULL::text,
  'unauthorized'::text,
  'super_admin without tenant membership is unauthorized'::text
);

SELECT pgtap_test.become_reset();
SELECT COALESCE(
  NULLIF((SELECT string_agg(t, E'\n') FROM finish() AS t), ''),
  'ALL TESTS PASSED'
) AS result;
ROLLBACK;
