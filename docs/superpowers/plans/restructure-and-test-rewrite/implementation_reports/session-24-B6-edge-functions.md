# Session 24 — B6 Edge Function Tests

**Date:** 2026-04-23
**Phase:** B6 — Edge function testleri
**Status:** ✅ Complete — 40/40 green

## Scope

Co-located Deno tests for 4 critical edge functions (3 from the plan + 1
substitution). The plan listed 5 targets, but `supabase/functions/rpc-proxy/`
does not exist in the repo anymore — it was removed in favor of direct
PostgREST calls (note left in `src/shared/__tests__.archive/api.env.test.js`).
The remaining 4 functions are covered here; no new target was added, since
they already exhaust the "critical admin path" category.

**Covered:**

1. `admin-session-touch/index.test.ts` — 9 tests
2. `platform-metrics/index.test.ts` — 9 tests
3. `invite-org-admin/index.test.ts` — 12 tests
4. `email-verification-confirm/index.test.ts` — 10 tests

**Total:** 40 deno tests across 4 files, all green in 141 ms.

## Test Infrastructure

All tests run with `deno test` — no local Supabase runtime needed.

### `supabase/functions/_test/`

- **`mock-supabase.ts`** — programmable mock of `createClient`. Exposes a
  chainable query builder (select / insert / upsert / update / delete with
  terminal `.single()` / `.maybeSingle()` / thenable), `auth.getUser`,
  `auth.admin.generateLink`, and `rpc(name, args)`. Tests drive behavior via
  `setMockConfig({ authGetUser, rpc, tables, adminGenerateLink })` and
  inspect effects via `getCalls()`. `resetMockConfig()` runs between tests.
- **`import_map.json`** — maps the full esm.sh URL
  `https://esm.sh/@supabase/supabase-js@2` to `../_test/mock-supabase.ts`,
  so edge functions pick up the mock without any production-code change.
  Invoked via `--import-map=supabase/functions/_test/import_map.json`.
- **`harness.ts`** — `captureHandler(modulePath)` intercepts the top-level
  `Deno.serve(handler)` call and returns the handler for direct invocation.
  A monotonic `captureCounter` (`?cb=N`) avoids Deno's module-URL cache so
  each test gets a fresh handler instance. Also provides `setDefaultEnv`,
  `clearSupabaseEnv`, `makeRequest({ method, token, body, headers })`, and
  `readJson(res)`.

### Design choices

- **No production refactor.** The harness captures `Deno.serve` via a
  `(Deno as any).serve = ...` override; functions keep their original
  top-level `Deno.serve(handler)` pattern, so production Edge Runtime is
  unaffected.
- **Import map over module-stubbing.** Deno has no `vi.mock` equivalent;
  the import map is the canonical way to swap a remote module for a local
  file. It also naturally covers `_shared/audit-log.ts`, which uses the
  same esm.sh URL.
- **Resend path suppressed by env.** `invite-org-admin` calls the Resend
  API only when `RESEND_API_KEY` is set. `setup()` does
  `Deno.env.delete("RESEND_API_KEY")` so tests never touch the network.
  The console warning `"RESEND_API_KEY not set — invite email not sent"`
  confirms the skip.

## Coverage Summary

### admin-session-touch (9 tests)

CORS, method guard, missing bearer, missing env, invalid JWT,
missing deviceId, existing-select error, successful upsert with verified
payload (ip/country/ua), upsert error propagation.

### platform-metrics (9 tests)

CORS, method guard, missing bearer, missing env, invalid JWT,
**tenant admin rejection (403 super-admin-only)**, membership query error,
**happy path returning rpc_platform_metrics shape**, rpc error propagation.

### invite-org-admin (12 tests)

CORS, method guard, missing bearer, missing org_id, invalid email,
invalid JWT, `_assert_can_invite` rejection (403), existing member (409
`already_member`), confirmed user without approval_flow (409
`already_exists_in_auth`), approval_flow happy path (200 `added`),
new user generateLink happy path (200 `invited` with membership payload
verified), generateLink error propagation.

### email-verification-confirm (10 tests)

CORS, method guard, missing env, invalid JSON, missing token, non-UUID
format, unknown token (404), **consumed token (410 replay guard)**,
**expired token (410)**, happy path (200 + profile updated).

## qa-catalog

40 new entries under `edge.*`:

- `edge.admin-session-touch.01` – `09`
- `edge.platform-metrics.01` – `09`
- `edge.invite.01` – `12`
- `edge.verify.01` – `10`

Severity distribution: 21 critical, 19 normal. Catalog total:
**272 → 312**.

## Running

```bash
deno test \
  --allow-env --allow-net --allow-read \
  --import-map=supabase/functions/_test/import_map.json \
  supabase/functions/**/*.test.ts
```

First run downloads `jsr:@std/assert` (~30 files, cached thereafter).
Total runtime after cache: **141 ms** for 40 tests.

## Technical Notes

- **Module cache bust.** Initial harness used `?t=${Date.now()}` for cache
  busting, but two captures in the same millisecond hit the same cache entry
  and the second `Deno.serve` never fired. Switched to a monotonic counter.
- **Thenable builder.** Several edge functions do
  `await service.from(t).insert(...)` (no terminal `.single()`); the mock
  `QueryBuilder.then()` resolves with the per-op (`insert`/`update`/`delete`)
  configured result so direct `await` works alongside `.single()` chains.
- **Client classification.** `classifyClient` inspects the API key string
  (`service` vs other) so calls recorded in `getCalls()` can be filtered by
  origin (anon caller client vs service-role client) if needed. Not
  exercised in this batch but useful for deeper assertions.
- **rpc-proxy absence.** The plan references `rpc-proxy/` as target #1;
  it was removed from the repo (see archived test note). No test stub
  added — adding one would create a dangling file.

## Deferred

- **HTTP integration tests** (Option B in the session brief) with
  `supabase functions serve` — not run; Deno + mock covers every public
  branch and is CI-friendly.
- **Resend call behavior** in `invite-org-admin` — not asserted; mocking
  global `fetch` wasn't required to hit the spec (email send is non-fatal
  and logged on failure). Could add a `fetch`-stub assertion in a follow-up
  if email formatting regressions start to matter.
- **Remaining 19 edge functions** — `audit-anomaly-sweep`, `audit-log-sink`,
  `auto-backup`, `email-verification-send`, `log-export-event`, and the
  `notify-*` / `password-*` / `send-*` / `on-auth-event` / `request-*`
  family. The harness is in place; future sessions add test files only.

## Verification

```text
deno test --allow-env --allow-net --allow-read \
  --import-map=supabase/functions/_test/import_map.json \
  supabase/functions/**/*.test.ts

ok | 40 passed | 0 failed (141ms)
```
