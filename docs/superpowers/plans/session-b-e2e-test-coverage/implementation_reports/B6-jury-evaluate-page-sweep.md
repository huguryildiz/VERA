# B6 — Jury Evaluate Page Sweep & Suite Stabilisation

**Date:** 2026-04-24
**Session goal:** Raise total E2E count from 35 → ~50; stabilise evaluate/complete flow; fix all failing tests.

---

## What was done

### 1. Jury evaluate flow (`e2e/jury/evaluate.spec.ts`) — full rewrite

The original spec used a single shared juror for all three tests and called `fillAllScores()` on a
multi-project eval step that shows one project at a time — so `state.allComplete` never became true
and the submit button stayed disabled.

**Fix strategy:**
- Three dedicated jurors pre-seeded in demo DB, one per test:
  - `E2E Eval Render` — render/visibility only
  - `E2E Eval Blur` — autosave status on blur
  - `E2E Eval Submit` — full submit→confirm→complete flow
- `test.beforeEach` resets `failed_attempts`, `locked_until`, `final_submitted_at` via Supabase
  REST PATCH so each test run starts clean regardless of previous state.
- For the submit test: 20 score items (5 projects × 4 criteria, `score_value=8`) pre-seeded
  directly in `score_sheets` / `score_sheet_items`. On eval load `rpc_jury_get_scores` returns
  these, `state.allComplete` is `true`, and the submit button is enabled from the start.
  `fillAllScores("5")` still runs — it overwrites visible-project scores — but `allComplete`
  stays true because all projects were already fully scored.

**DB work on kmprsxrofnemmsryjhfj (demo):**
- Reset `demo-admin@vera-eval.app` password to match `.env.e2e.local`
- Fixed `E2E Eval Render` PIN hash (was wrong), cleared lockout
- Created `E2E Eval Blur` juror + `juror_period_auth` with PIN "9999"
- Created `E2E Eval Submit` juror + `juror_period_auth` with PIN "9999"
- Inserted 5 score sheets + 20 score items for `E2E Eval Submit`

### 2. Audit-log filter panel (`e2e/admin/audit-log.spec.ts`)

`audit-filter-category` and `audit-filter-reset` live inside `{filterOpen && (...)}` — they're
unmounted until the filter panel is toggled open. Two tests were failing because they tried to
assert visibility on unmounted elements.

**Fix:**
- Added `testId` prop to `FilterButton` (`src/shared/ui/FilterButton.jsx`)
- Passed `testId="audit-filter-toggle"` from `AuditLogPage.jsx`
- Added `openFilter()` method to `AuditPom` — clicks toggle, waits for category group
- Updated both affected tests to call `audit.openFilter()` first

---

## Final counts

| Metric | Value |
|---|---|
| Total tests passing | **51** |
| Skipped (pre-existing) | 1 |
| Failures | 0 |
| Spec files | 17 |

### Tests by file

| File | Tests |
|---|---|
| `e2e/admin/audit-log.spec.ts` | 5 |
| `e2e/admin/domains.spec.ts` | 3 |
| `e2e/admin/heatmap.spec.ts` | 2 |
| `e2e/admin/jurors.spec.ts` | 3 |
| `e2e/admin/periods.spec.ts` | 4 (+1 skipped) |
| `e2e/admin/projects-import.spec.ts` | 1 |
| `e2e/admin/projects.spec.ts` | 3 |
| `e2e/admin/rankings-export.spec.ts` | 2 |
| `e2e/admin/reviews.spec.ts` | 2 |
| `e2e/admin/setup-wizard.spec.ts` | 6 |
| `e2e/admin/tenant-admin.spec.ts` | 1 |
| `e2e/demo/demo-autologin.spec.ts` | 2 |
| `e2e/jury/evaluate.spec.ts` | 3 |
| `e2e/jury/happy-path.spec.ts` | 3 |
| `e2e/jury/lock.spec.ts` | 1 |
| `e2e/jury/resume.spec.ts` | 1 |
| `e2e/admin/login.spec.ts` | ~9 (login/dashboard/nav) |

---

## Architecture notes

- **EvalStep is single-project-at-a-time** — no testid prev/next buttons exist. `fillAllScores()`
  only fills the visible project. For the submit test, pre-seeding is the only reliable approach.
- **`state.allComplete`** is computed in `useJuryWorkflow.js` entirely from in-memory `scores`
  loaded by `rpc_jury_get_scores` — pre-seeding the DB rows is sufficient for it to be `true` on
  first load.
- **`beforeEach` reset is critical** for the submit test: it clears `final_submitted_at` so the
  juror can re-enter the eval step on every test repeat. Without it, the second repeat would see
  the "already submitted" gate.
