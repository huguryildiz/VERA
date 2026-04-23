# Running pgTAP tests

SQL-level tests for VERA. Each file is **self-contained**: wraps its body in
`BEGIN … ROLLBACK`, seeds what it needs, asserts, and leaves the database
unchanged on exit. Safe to run against prod and demo without persisting any
fixture rows.

## Layout

```text
sql/tests/
├── _helpers.sql         Shared fixtures (pgtap_test schema).
│                        Install once per DB; idempotent.
├── rls/                 Row-Level Security isolation tests (9 files).
├── rpcs/
│   ├── jury/            Jury-facing RPC behavior tests (4 files).
│   └── admin/           Admin-facing RPC behavior tests (5 files).
├── migrations/          Migration idempotency tests (1 file).
└── RUNNING.md           This file.
```

Each test file ends with a single-row `result` column:

- `ALL TESTS PASSED` — every `plan()` assertion passed.
- `# Looks like you failed N tests of M` — pgTAP failure summary.

## Prereqs

The `pgtap` extension + grants must be in place:

```sql
-- sql/migrations/001_extensions.sql
CREATE EXTENSION IF NOT EXISTS "pgtap" SCHEMA tap;
GRANT USAGE   ON SCHEMA tap TO authenticated, anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA tap TO authenticated, anon;
```

And the test helpers must be installed (`sql/tests/_helpers.sql`) on **both**
`vera-prod` and `vera-demo`. The helpers create the `pgtap_test` schema and
define `seed_two_orgs()` / `seed_periods()` / `seed_projects()` /
`seed_jurors()` / `seed_entry_tokens()` / `become_a()` / `become_b()` /
`become_super()` / `become_reset()`.

## Running — option A: `pg_prove` (local)

```bash
# Install pg_prove if missing:
cpan TAP::Parser::SourceHandler::pgTAP

# Apply helpers once (idempotent):
psql "$DATABASE_URL" -f sql/tests/_helpers.sql

# Run a single suite:
pg_prove -d "$DATABASE_URL" sql/tests/rls/*.sql

# Run everything:
pg_prove -d "$DATABASE_URL" sql/tests/**/*.sql
```

## Running — option B: Supabase MCP `execute_sql`

Claude Code + the Supabase MCP can run each file by passing its contents to
`mcp__claude_ai_Supabase__execute_sql`. Every file is wrapped in
`BEGIN / ROLLBACK` so nothing persists. Concatenating multiple test files in
one call is NOT recommended — each file redefines the `plan()` count and
relies on its own transaction.

## Running — option C: Supabase SQL Editor

Paste the contents of a single test file into the SQL Editor and Run. The
result pane shows the final `result` column.

## Writing new tests

1. Start with `BEGIN;` + `SET LOCAL search_path = tap, public, extensions;`
   + `SELECT plan(N);`.
2. Call the `pgtap_test.seed_*` helpers you need (or inline your own seed for
   niche tables — keep ids prefixed with `pgtap-` / `pgtap_` so intent is
   obvious).
3. Use `pgtap_test.become_a()` / `become_b()` / `become_super()` /
   `become_reset()` to switch caller identity. These issue
   `SET LOCAL role authenticated` + set `request.jwt.claims.sub`, so RLS and
   `auth.uid()`-based RPC gates behave like real traffic.
4. Always cast the description argument: `SELECT is(x, y, 'desc'::text)`.
   Without the `::text` cast, pgTAP's polymorphic overload does not resolve
   when `x`/`y` come from subqueries.
5. Close with
   `SELECT COALESCE(NULLIF((SELECT string_agg(t, E'\n') FROM finish() AS t), ''), 'ALL TESTS PASSED');`
   + `ROLLBACK;`.

## Known pitfalls

- `SET LOCAL role authenticated` is sticky until `RESET role` / `become_reset()`.
  Seed data BEFORE switching roles — `authenticated` cannot INSERT into
  `auth.users` / `profiles` / `memberships` / etc.
- `_assert_period_unlocked` triggers block writes to `projects`,
  `score_sheets`, `score_sheet_items` when `periods.is_locked = true`. If you
  need scores under a locked period, seed **before** locking and flip
  `is_locked=true` via a direct `UPDATE` after the inserts.
- Temp tables (`CREATE TEMP TABLE … ON COMMIT DROP`) are owned by
  `postgres`; add `GRANT SELECT ON …  TO authenticated` if a test reads them
  after `become_*`. Easier: use `SELECT … FROM (VALUES …)` or inline arrays.

## Current suite summary (session 23)

| Folder                | Files | Assertions |
|-----------------------|------:|-----------:|
| `rls/`                |     9 |         36 |
| `rpcs/jury/`          |     4 |         19 |
| `rpcs/admin/`         |     5 |         19 |
| `migrations/`         |     1 |  (legacy)  |
| **Total**             | **19**|     **74** |

All 18 pgTAP files pass on `vera-prod`; smoke subset passes on `vera-demo`.
