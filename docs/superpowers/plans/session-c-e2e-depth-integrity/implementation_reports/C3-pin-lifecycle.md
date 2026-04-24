# C3 — PIN Blocking Full Lifecycle

**Sprint:** Session C — E2E Depth & Integrity  
**Date:** 2026-04-24  
**Status:** Complete

## What was built

Three DB-validating E2E tests proving the PIN lockout lifecycle end-to-end:

| File | Test | Assertion |
|------|------|-----------|
| `e2e/jury/lock.spec.ts` | `3 failed PIN attempts → locked screen + DB state` | Submits wrong PIN "0000" three times; asserts `failed_attempts=3` and `locked_until > now()` in `juror_period_auth` via service-role client. |
| `e2e/admin/pin-blocking.spec.ts` | `admin unlock → failed_attempts and locked_until reset in DB` | Seeds juror with `failed_attempts=3`, future `locked_until`; admin clicks unlock → closes modal; asserts `failed_attempts=0` and `locked_until IS NULL` in DB. |
| `e2e/admin/pin-blocking.spec.ts` | `expired locked_until → PIN attempt accepted` | Seeds juror with `failed_attempts=3` and a 2-minute-past `locked_until`; submits correct PIN "9999" → advances to `progress` step (lockout transparently expired). |

## Infrastructure added

**`e2e/helpers/supabaseAdmin.ts`** — two new exports:

- `readJurorAuth(jurorId, periodId)` — queries `failed_attempts, locked_until, is_blocked, session_token_hash` from `juror_period_auth` with service-role client (bypasses RLS).
- `resetJurorAuth(jurorId, periodId)` — PATCHes `failed_attempts=0, locked_until=null, final_submitted_at=null, session_token_hash=null`. The `session_token_hash: null` field is mandatory (F1 rule) — without it, repeat-each runs see "session opened on another device" because the previous run's hash is still stored.

**`e2e/fixtures/seed-ids.ts`** — `LOCKED_JUROR_ID` exported at module level (was previously inlined only in `pin-blocking.spec.ts`).

## Sync-point fix in `lock.spec.ts`

The original implementation used `await expect(jury.pinInput(0)).toHaveValue("", { timeout: 5_000 })` between PIN attempts. This was replaced with:

```typescript
await expect(jury.pinSubmit()).toContainText("Verify PIN", { timeout: 8_000 });
```

**Why:** The `useEffect([state.pinError])` in `PinStep.jsx` clears inputs only when `pinError` changes. Crucially, `handlePinSubmit` in `useJurySessionHandlers.js` calls `session.setPinError("")` at the very start of each call (before the RPC await), so the transition is always `"Incorrect PIN."` → `""` → `"Incorrect PIN."` — the effect fires reliably on each attempt. However, tracking `submitting` state via the button text (`"Verifying…"` → `"Verify PIN"`) is a more direct and semantically correct sync point that does not depend on the useEffect firing before the next `fillPin` begins.

## Non-obvious findings

**Parallel worker DB row competition.** `lock.spec.ts` and `pin-blocking.spec.ts` share `EVAL_JURORS[0]` + `EVAL_PERIOD_ID`. Running without `--workers=1` causes both specs to compete on the same `juror_period_auth` row. Symptoms: button stuck at "Verifying…" after 8s (previous test's `resetJurorAuth` clears the session hash mid-test), or `waitForPinStep()` never resolves. Fix: always run these tests with `--workers=1`.

**`rpc_jury_verify_pin` lockout path.** The RPC locks after `failed_attempts >= maxPinAttempts`. On the 3rd wrong attempt it increments to 3, sets `locked_until`, and returns error code `"juror_blocked"`. The jury state machine transitions to the `locked` step only via `juror_blocked` — not via `invalid_pin`. This means `waitForLockedStep()` on attempt 3 (not attempt 1 or 2) is correct and deterministic.

**`rpc_juror_unlock_pin` is triggered by `closeModal()`.** The admin PIN-blocking page calls the unlock RPC when the modal is dismissed (not when the unlock button is clicked). The test therefore must call `clickUnlock` → assert `modal().toBeVisible()` → `closeModal()` before reading the DB.

**`LoginPom.goto()` default timeout.** The original `expect(this.emailInput()).toBeVisible()` used Playwright's default 5s. On `--repeat-each=3`, cold page loads after a previous admin session can exceed this. Fixed to `{ timeout: 15_000 }`.

## Results

- Flake check: 27/27 (9 grep-matched tests × 3 repeats, `--workers=1`)
- Full suite: 85 passed, 6 pre-existing failures (all unrelated to C3 — `organizations-crud`, `rankings-export`, `setup-wizard`, `tenant-application`, `forgot-password`, `rbac-boundary`), 2 skipped
- Zero regressions introduced by C3
