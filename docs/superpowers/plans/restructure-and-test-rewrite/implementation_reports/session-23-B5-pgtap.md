# Session 23 — B5: pgTAP (RLS + RPC behavior tests)

**Date:** 2026-04-23
**Status:** ✅ Complete
**Test results:** 18 pgTAP files / 74 assertions — all green on `vera-prod`;
smoke subset (4 assertions) green on `vera-demo`.

---

## Scope

Add SQL-level tests for the DB layer. Covers:

1. **pgTAP bootstrap** — extension + grants applied to both projects.
2. **RLS isolation** — 9 tables' multi-tenant + super-admin bypass behavior.
3. **RPC behavior** — 4 jury + 5 admin RPCs' happy paths, error codes, and
   tenant/auth gates.

---

## Infrastructure

### `sql/migrations/001_extensions.sql`

Added `pgtap` in its own `tap` schema, plus `GRANT USAGE + EXECUTE` to
`authenticated`/`anon`. Without those grants, tests calling `tap.is()` after
`SET LOCAL role authenticated` fail with `function is(int,int,text) does not exist`.

Deployed to both `vera-prod` and `vera-demo` via Supabase MCP `apply_migration`.

### `sql/tests/_helpers.sql` (new, 197 lines)

Idempotent shared fixtures in a `pgtap_test` schema:

- `seed_two_orgs()` — 2 orgs, 2 org_admins (one each), 1 super_admin, and
  backing `auth.users`/`profiles` rows.
- `seed_periods()` — 1 unlocked + 1 locked period per org (4 total).
- `seed_projects()`, `seed_jurors()`, `seed_entry_tokens()`.
- `become(user_id)` — `SET LOCAL role authenticated` +
  `SET LOCAL request.jwt.claims = {"sub": user_id, "role": "authenticated"}`.
- `become_a()` / `become_b()` / `become_super()` / `become_reset()` shortcuts.

All fixture rows use deterministic UUIDs with an obvious `pgtap-` / `pgtap_`
naming prefix, so they are impossible to confuse with real data even though
every test wraps its body in `BEGIN … ROLLBACK`.

---

## Files Created

```text
sql/tests/
├── _helpers.sql
├── RUNNING.md
├── rls/
│   ├── organizations_isolation.sql     (6 assertions)
│   ├── memberships_isolation.sql       (5 assertions)
│   ├── periods_isolation.sql           (4 assertions)
│   ├── projects_isolation.sql          (3 assertions)
│   ├── jurors_isolation.sql            (3 assertions)
│   ├── entry_tokens_isolation.sql      (3 assertions)
│   ├── audit_logs_isolation.sql        (4 assertions)
│   ├── scores_isolation.sql            (4 assertions)
│   └── frameworks_isolation.sql        (4 assertions)
├── rpcs/
│   ├── jury/
│   │   ├── validate_entry_token.sql    (4 assertions)
│   │   ├── authenticate.sql            (5 assertions)
│   │   ├── verify_pin.sql              (5 assertions)
│   │   └── upsert_score.sql            (5 assertions)
│   └── admin/
│       ├── list_organizations.sql      (2 assertions)
│       ├── mark_setup_complete.sql     (4 assertions)
│       ├── generate_entry_token.sql    (5 assertions)
│       ├── set_period_lock.sql         (4 assertions)
│       └── org_admin_list_members.sql  (4 assertions)
└── migrations/
    └── idempotency.test.js             ← moved from __tests__.archive/
```

Totals: 18 new pgTAP files / 74 assertions (plus the existing
`idempotency.test.js` kept under `migrations/`).

---

## Critical Fixes & Learnings

### 1. pgTAP needs USAGE/EXECUTE grants on its schema

`SET LOCAL search_path = tap, public, extensions;` alone is not enough —
once we `SET LOCAL role authenticated`, the `tap` schema is invisible
unless granted. Fix: `GRANT USAGE ON SCHEMA tap TO authenticated, anon` +
`GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA tap …`. Baked into
`001_extensions.sql` so fresh DBs pick this up.

### 2. `is()` description argument needs an explicit `::text` cast

`SELECT is((SELECT count(*)::int FROM t), 1, 'desc')` fails with
`function is(integer, integer, unknown) does not exist` when the first arg
is a subquery. The unknown-typed literal isn't auto-resolved against
pgTAP's polymorphic `is(anyelement, anyelement, text)` overload in that
shape. Fix: always write `'desc'::text`.

### 3. Temp tables block `authenticated` without an explicit GRANT

`CREATE TEMP TABLE _x (…) ON COMMIT DROP` is owned by `postgres`; after
`SET LOCAL role authenticated`, `SELECT FROM _x` fails
`42501: permission denied`. Workarounds that worked:

- `WHERE id = ANY (ARRAY[...]::uuid[])` — eliminates the temp table entirely.
- `GRANT SELECT ON _x TO authenticated` after the `CREATE`.

Every new RLS test file uses the array form. Only one RPC test
(`upsert_score.sql`) uses a temp table — and it accesses it BEFORE
switching roles, so no grant is needed.

### 4. `periods_select_public_visible` exposes **locked** periods to everyone

Initial `periods_isolation.sql` asserted "admin A sees only 2 of the 4
seeded periods". It failed — admin A actually sees 3 (the 2 in org A via
`periods_select` + the locked period in org B via
`periods_select_public_visible` `USING (is_locked = true)`). This is
intentional for the jury identity step, but asymmetric with the other
tenant-scoped tables. Test was rewritten to assert the asymmetry
explicitly (both branches of the policy).

### 5. `_assert_period_unlocked` triggers block score seeding on locked periods

Admin `set_period_lock` test needs scored rows on a locked period to
exercise the "cannot unlock with scores" guard. Straight inserts into
`projects`/`score_sheets` under a locked period are rejected by
`trigger_block_period_child_on_locked`. Workaround: insert while the
period is `is_locked=false`, then flip `UPDATE periods SET is_locked=true`
after the seed completes.

### 6. `rpc_jury_authenticate` polymorphic overload

`rpc_jury_authenticate(p_period_id, p_juror_name, p_affiliation, ...)`
has defaults on the last two parameters, but PostgREST/PG function
resolution needs either all or the leading positional args. From SQL we
always pass all five (including `NULL, NULL`) to avoid ambiguity.

---

## Issues / follow-ups

None blocking. All 18 pgTAP files pass on `vera-prod`; the smoke subset
on `vera-demo` confirms cross-env parity for extensions and grants.

Possible follow-up S23b (future session):

- Expand jury RPC coverage: `rpc_jury_get_scores`, `rpc_jury_finalize_submission`,
  `rpc_jury_project_rankings` (each has non-trivial edge cases).
- Expand admin RPC coverage: `rpc_period_freeze_snapshot`,
  `rpc_admin_save_period_criteria`, `rpc_admin_upsert_period_criterion_outcome_map`,
  `rpc_admin_delete_organization`, `rpc_admin_verify_audit_chain`.
- Wire `pg_prove` into CI via a disposable branch database (Supabase branch
  API) so every PR runs the suite before merge.

---

## Full suite state

| Suite                | Files | Assertions |
|----------------------|------:|-----------:|
| Vitest (JS)          |   112 |        278 |
| **pgTAP (SQL, new)** | **18**|     **74** |

- Vitest: unchanged since S22 — 278/278 green in 7.82s.
- pgTAP: 18/18 green on `vera-prod`; 4-assertion smoke green on `vera-demo`.
