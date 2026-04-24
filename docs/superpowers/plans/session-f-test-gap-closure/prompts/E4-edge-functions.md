> **⚠️ SUPERSEDED 2026-04-25** — Bu prompt 8/13 untested fonksiyonu kapsıyordu (5 mail şablonu bilinçli atlanmıştı). User kararı: tüm 13'ü kapatmak. **Yerine geçen plan:** `../../session-g-edge-coverage-closure/prompts/G-all-edge-functions.md`. Bu dosyayı **yürütme**.

VERA — Session F F4: Edge Function Long-Tail (Deno Tests)

## Your job

Write real Deno tests for 8 critical Supabase Edge Functions using the existing test
harness. Update qa-catalog.json. Run `npm run test:edge` to verify 0 failures.

## Context

VERA is a multi-tenant academic jury platform with Supabase Edge Functions (Deno).
Session D already set up a Deno test harness at `supabase/functions/_test/`.

**Do NOT use** `src/shared/api/edge/__tests__/edgeFunctions.test.js` as a reference —
that file contains parallel re-implementations (not real tests). The `_test/` harness
tests actual Deno code via `import` of the real `index.ts` files.

## Step 1: Read the existing harness and any existing test files

1. `supabase/functions/_test/deno.json` — Deno config
2. `supabase/functions/_test/_harness/supabase-mock.ts` — `makeMockSupabase()`
3. `supabase/functions/_test/_harness/env.ts` — `stubEnv()`
4. `supabase/functions/_test/_harness/fetch-mock.ts` — `stubFetch()`
5. Any `*.test.ts` files already in `supabase/functions/_test/` — understand existing pattern

## Step 2: Read each target edge function source file

For each function, read `index.ts` to understand:

- How it checks auth (token header? `auth.getUser`? service role?)
- What Supabase RPCs/tables it calls
- What status codes and response shapes it returns
- How it handles errors

Target functions (8):

1. `supabase/functions/on-auth-event/index.ts`
2. `supabase/functions/request-score-edit/index.ts`
3. `supabase/functions/send-export-report/index.ts`
4. `supabase/functions/auto-backup/index.ts`
5. `supabase/functions/notify-maintenance/index.ts`
6. `supabase/functions/receive-email/index.ts`
7. `supabase/functions/password-reset-email/index.ts`
8. `supabase/functions/email-verification-send/index.ts`

## Step 3: Write test files

Create in `supabase/functions/_test/`:

- `on-auth-event.test.ts`
- `request-score-edit.test.ts`
- `send-export-report.test.ts`
- `auto-backup.test.ts`
- `notify-maintenance.test.ts`
- `receive-email.test.ts`
- `password-reset-email.test.ts`
- `email-verification-send.test.ts`

Minimum 5 tests per function. Use existing harness:

```ts
import { makeMockSupabase } from "./_harness/supabase-mock.ts";
import { stubEnv } from "./_harness/env.ts";
import { stubFetch } from "./_harness/fetch-mock.ts";
import { assertEquals } from "std/assert/mod.ts";
```

Standard test cases (adapt based on what you find in each source file):

- Missing/invalid auth token → 401
- Unauthorized role → 403 (if applicable)
- Valid request → 200 + expected response shape
- DB error → 500 propagation
- Missing required fields → 400

## Step 4: Update qa-catalog.json

New IDs go in `edge.real.*` namespace:
`edge.real.on-auth-event.01`, `edge.real.request-score-edit.01`, etc.

Add entries to `src/test/qa-catalog.json` before running tests.

## Step 5: Run and verify

```bash
npm run test:edge     # Deno side — must be 0 failures
npm test -- --run     # Vitest side — must be 0 regressions
```

Write implementation report to:
`docs/superpowers/plans/session-f-test-gap-closure/implementation_reports/F4-edge-functions.md`

Include: which functions tested, test count per function, any functions skipped and why.

## Rules

- NEVER modify source `index.ts` files — only write test files
- NEVER commit
- If a function's handler is not exported and can't be invoked from a test without
  refactoring source: document it as Known Gap and skip that function
- ID namespace: `edge.real.*` — do not touch `edge.contract.*` entries
- Run BOTH test runners before writing report
