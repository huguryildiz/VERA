-- RLS: audit_logs — tenant-scoped SELECT + append-only (no DELETE).
--
-- Policies (sql/migrations/004_rls.sql):
--   audit_logs_select       — organization_id in caller's memberships OR super_admin
--   no_delete_audit_logs    — DELETE USING (false): row filter blocks all deletes.
--                             Note: this means DELETE succeeds with 0 rows
--                             affected rather than raising an exception — the
--                             test asserts the row still exists afterwards.

BEGIN;
SET LOCAL search_path = tap, public, extensions;
SELECT plan(4);

SELECT pgtap_test.seed_two_orgs();

INSERT INTO audit_logs (
  id, organization_id, user_id, action, category, severity, actor_type, details
) VALUES
  ('aaaaaaaa-beef-4000-8000-000000000001'::uuid,
   '11110000-0000-4000-8000-000000000001'::uuid,
   'aaaa0000-0000-4000-8000-000000000001'::uuid,
   'pgtap.audit.test', 'access', 'info', 'admin', '{}'::jsonb),
  ('bbbbbbbb-beef-4000-8000-000000000002'::uuid,
   '22220000-0000-4000-8000-000000000002'::uuid,
   'bbbb0000-0000-4000-8000-000000000002'::uuid,
   'pgtap.audit.test', 'access', 'info', 'admin', '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- ────────── admin A scope ──────────
SELECT pgtap_test.become_a();

SELECT is(
  (SELECT count(*)::int FROM audit_logs
   WHERE id = ANY (ARRAY[
     'aaaaaaaa-beef-4000-8000-000000000001'::uuid,
     'bbbbbbbb-beef-4000-8000-000000000002'::uuid
   ])),
  1,
  'admin A sees only their own org audit row'::text
);

-- Attempted DELETE must not remove the row (policy filters it out).
DELETE FROM audit_logs WHERE id = 'aaaaaaaa-beef-4000-8000-000000000001'::uuid;

SELECT is(
  (SELECT count(*)::int FROM audit_logs
   WHERE id = 'aaaaaaaa-beef-4000-8000-000000000001'::uuid),
  1,
  'audit row survives DELETE (append-only policy)'::text
);

-- ────────── admin B cannot see org A audit rows ──────────
SELECT pgtap_test.become_reset();
SELECT pgtap_test.become_b();

SELECT is(
  (SELECT count(*)::int FROM audit_logs
   WHERE id = 'aaaaaaaa-beef-4000-8000-000000000001'::uuid),
  0,
  'admin B cannot see org A audit rows'::text
);

-- ────────── super admin sees both ──────────
SELECT pgtap_test.become_reset();
SELECT pgtap_test.become_super();

SELECT is(
  (SELECT count(*)::int FROM audit_logs
   WHERE id = ANY (ARRAY[
     'aaaaaaaa-beef-4000-8000-000000000001'::uuid,
     'bbbbbbbb-beef-4000-8000-000000000002'::uuid
   ])),
  2,
  'super_admin sees audit rows for both orgs'::text
);

SELECT pgtap_test.become_reset();
SELECT COALESCE(
  NULLIF((SELECT string_agg(t, E'\n') FROM finish() AS t), ''),
  'ALL TESTS PASSED'
) AS result;
ROLLBACK;
