-- RPC: rpc_jury_authenticate(period_id, name, affiliation, force_reissue, email)
--
-- Contract (see 005_rpcs_jury.sql):
--   * New juror → jurors row is created, pin_hash is set, response includes
--     pin_plain_once (the 4-digit PIN) and needs_pin=false ("we just minted
--     the PIN — show it").
--   * Repeat call on same (period, name, affiliation) → pin_plain_once=NULL,
--     needs_pin=true ("juror must type their existing PIN").
--   * Bad period_id → { error: 'period_not_found' }.

BEGIN;
SET LOCAL search_path = tap, public, extensions;
SELECT plan(5);

SELECT pgtap_test.seed_two_orgs();
SELECT pgtap_test.seed_periods();

-- ────────── 1. bad period returns period_not_found ──────────
SELECT is(
  (SELECT rpc_jury_authenticate(
     '00000000-0000-4000-8000-000000000000'::uuid,
     'pgtap Juror Z', 'pgtap dept', false, NULL
   )->>'error'),
  'period_not_found'::text,
  'bad period_id → error: period_not_found'::text
);

-- ────────── 2. first auth mints PIN ──────────
SELECT isnt(
  (SELECT rpc_jury_authenticate(
     'cccc0000-0000-4000-8000-000000000001'::uuid,
     'pgtap Juror New', 'pgtap dept', false, NULL
   )->>'pin_plain_once'),
  NULL::text,
  'first auth mints a PIN (pin_plain_once not null)'::text
);

-- ────────── 3. first auth creates jurors row ──────────
SELECT is(
  (SELECT count(*)::int FROM jurors
   WHERE juror_name = 'pgtap Juror New' AND affiliation = 'pgtap dept'
     AND organization_id = '11110000-0000-4000-8000-000000000001'::uuid),
  1,
  'jurors row is created on first auth'::text
);

-- ────────── 4. second auth returns needs_pin=true ──────────
SELECT is(
  (SELECT (rpc_jury_authenticate(
     'cccc0000-0000-4000-8000-000000000001'::uuid,
     'pgtap Juror New', 'pgtap dept', false, NULL
   )->>'needs_pin')::boolean),
  true,
  'second auth returns needs_pin=true (PIN already set)'::text
);

-- ────────── 5. second auth does NOT leak PIN ──────────
SELECT is(
  (SELECT rpc_jury_authenticate(
     'cccc0000-0000-4000-8000-000000000001'::uuid,
     'pgtap Juror New', 'pgtap dept', false, NULL
   )->>'pin_plain_once'),
  NULL::text,
  'second auth returns pin_plain_once=NULL (never leak existing PIN)'::text
);

SELECT COALESCE(
  NULLIF((SELECT string_agg(t, E'\n') FROM finish() AS t), ''),
  'ALL TESTS PASSED'
) AS result;
ROLLBACK;
