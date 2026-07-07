-- RLS regression: a self-created 'requested' membership must grant ZERO
-- cross-tenant access.
--
-- Guards the fix for the tenant-isolation breach where every org-scoping RLS
-- predicate checked membership but not status='active'. Because
-- rpc_request_to_join_org (SECURITY DEFINER, granted to authenticated) inserts
-- a role='org_admin', status='requested' row for any org, that row previously
-- satisfied the predicate and exposed the target org's data. The fix appends
-- `AND status = 'active'` to every such predicate (sql/migrations/004_rls.sql).
--
-- Note on scope: `organizations` is intentionally anon-readable, and *locked*
-- periods are public by design (periods_select_public_visible). This test
-- therefore probes only tenant-protected surfaces with no public carve-out:
-- jurors, and *unlocked* periods.

BEGIN;
SET LOCAL search_path = tap, public, extensions;
SELECT plan(3);

SELECT pgtap_test.seed_two_orgs();
SELECT pgtap_test.seed_periods();
SELECT pgtap_test.seed_jurors();

-- An attacker: a signed-up user whose ONLY tie to Org A is a self-service
-- 'requested' join (exactly what rpc_request_to_join_org creates).
INSERT INTO auth.users (id, instance_id, aud, role, email) VALUES
  ('cccccccc-0000-4000-8000-0000000000aa'::uuid,
   '00000000-0000-0000-0000-000000000000'::uuid,
   'authenticated','authenticated','pgtap_attacker@test.local')
ON CONFLICT (id) DO NOTHING;
INSERT INTO profiles (id, display_name) VALUES
  ('cccccccc-0000-4000-8000-0000000000aa'::uuid, 'pgtap Attacker')
ON CONFLICT (id) DO NOTHING;
INSERT INTO memberships (user_id, organization_id, role, status) VALUES
  ('cccccccc-0000-4000-8000-0000000000aa'::uuid,
   '11110000-0000-4000-8000-000000000001'::uuid, 'org_admin', 'requested')
ON CONFLICT (user_id, organization_id) DO NOTHING;

-- ────────── become the attacker (requested-only membership to Org A) ──────────
SELECT pgtap_test.become('cccccccc-0000-4000-8000-0000000000aa'::uuid);

SELECT is(
  (SELECT count(*)::int FROM jurors
   WHERE organization_id = '11110000-0000-4000-8000-000000000001'::uuid),
  0,
  'requested member sees ZERO of Org A jurors (PII stays isolated)'::text
);

SELECT is(
  (SELECT count(*)::int FROM periods
   WHERE organization_id = '11110000-0000-4000-8000-000000000001'::uuid
     AND is_locked = false),
  0,
  'requested member sees ZERO of Org A unlocked periods'::text
);

-- Positive control: the attacker's session is live and RLS is not simply
-- erroring — they can still see their own membership row.
SELECT is(
  (SELECT count(*)::int FROM memberships
   WHERE user_id = 'cccccccc-0000-4000-8000-0000000000aa'::uuid),
  1,
  'requested member still sees their own membership row (session is real)'::text
);

SELECT pgtap_test.become_reset();
SELECT COALESCE(
  NULLIF((SELECT string_agg(t, E'\n') FROM finish() AS t), ''),
  'ALL TESTS PASSED'
) AS result;
ROLLBACK;
