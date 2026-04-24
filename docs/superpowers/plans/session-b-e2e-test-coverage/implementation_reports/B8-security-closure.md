# B8 — Security Boundary, Tenant Application & Final Closure

**Date:** 2026-04-24
**Session goal:** Raise total E2E count from 67 → ~75; add cross-tenant RLS tests, jury expired-session guard, tenant application approve/reject, Google OAuth smoke, and deepen jury evaluate coverage. Achieve 0 failures and 0 flake on `--repeat-each=3`.

---

## What was done

### 1. Cross-tenant data isolation — RLS boundary (`e2e/security/tenant-isolation.spec.ts`) — 3 tests

Hits the Supabase REST API directly with a tenant-admin JWT. Asserts that RLS returns zero rows for another org's `memberships`, `periods`, and `jurors` tables. Pre-seeded `tenant-admin@vera-eval.app` user (TenantAdmin2026!) in demo DB.

Key decision: `projects` table has no `organization_id` column — replaced that test with `periods` to avoid a 400 column-not-found error.

### 2. Jury expired session guard (`e2e/jury/expired-session.spec.ts`) — 2 tests

Uses `addInitScript` to clear `jury_access_period` / `jury_access_period_demo` from both storages before navigation. Asserts that `JuryGuard` redirects to `/eval` (or `/demo/eval`) rather than allowing access to `jury/pin`.

### 3. Tenant application approve/reject (`e2e/admin/tenant-application.spec.ts`) — 2 tests

Seeds a `pending` application via service-role REST API, navigates as super-admin to Organisations page, clicks Approve/Reject, and asserts the badge appears. Cleans up seeded row in `finally`.

**Bug fixed:** `PendingApplicationsPanel` had a race condition — `setOutcomes` was called after `await onApprove`, but `onApprove` triggers `loadOrgs` which removes the pending application from the list, unmounting the panel before state could update. Fixed with optimistic UI: `setOutcomes` is now called **before** `await onApprove`.

New POM: `e2e/poms/TenantApplicationPom.ts`.

### 4. Google OAuth smoke (`e2e/auth/google-oauth.spec.ts`) — 1 test

Intercepts `**/auth/v1/authorize**` via `page.route()`, clicks the Google login button, and asserts `provider=google` appears in the captured URL. The route is aborted after capture (no real OAuth session needed).

### 5. Jury evaluate deepening (`e2e/jury/evaluate.spec.ts`) — +2 tests

Added:
- **All-complete banner** — fills all scores on "E2E Eval Submit" juror (1 project), asserts `jury-eval-all-complete-banner` is visible.
- **Back button** — clicks back, asserts progress step title is visible.

**Bug fixed 1:** SpotlightTour overlay was blocking interactions on the eval step. Added `addInitScript` to suppress all jury tour keys (`dj_tour_done`, `dj_tour_eval`, `dj_tour_rubric`, `dj_tour_confirm`) before page scripts run.

**Bug fixed 2:** Back button was calling `onBack` which navigated to `/` (exiting jury flow entirely — same behavior as LockedStep's explicit comment). Fixed: EvalStep back button now calls `state.setStep("progress_check")` directly. Removed `onBack` from EvalStep props.

New POM members added to `JuryEvalPom.ts`: `allCompleteBanner()`, `backBtn()`, `clickBack()`.

---

## Test additions per file

| File | New tests | Total in file |
|------|-----------|---------------|
| `e2e/security/tenant-isolation.spec.ts` | 3 (new file) | 3 |
| `e2e/jury/expired-session.spec.ts` | 2 (new file) | 2 |
| `e2e/admin/tenant-application.spec.ts` | 2 (new file) | 2 |
| `e2e/auth/google-oauth.spec.ts` | 1 (new file) | 1 |
| `e2e/jury/evaluate.spec.ts` | +2 | 5 |
| **Total added** | **10** | |

---

## Final pass-rate

| Run | Passing | Failing | Skipped |
|-----|---------|---------|---------|
| Full suite | **77** | 0 | 1 |
| Flake check (`--repeat-each=3`, B8 specs only) | **39 / 39** | 0 | 0 |

The 1 skip is `periods lifecycle — live period can be closed` (pre-existing, requires a live-state period; out of scope for B8).

---

## Source files changed

- `src/jury/features/evaluation/EvalStep.jsx` — back button uses `state.setStep("progress_check")`; `data-testid="jury-eval-back-btn"` added; `onBack` prop removed
- `src/admin/features/organizations/components/PendingApplicationsPanel.jsx` — optimistic badge state
- `e2e/poms/JuryEvalPom.ts` — `allCompleteBanner()`, `backBtn()`, `clickBack()`
- `e2e/poms/TenantApplicationPom.ts` — new POM
- `e2e/jury/evaluate.spec.ts` — tour suppression + 2 new tests
- `e2e/security/tenant-isolation.spec.ts` — new file
- `e2e/jury/expired-session.spec.ts` — new file
- `e2e/admin/tenant-application.spec.ts` — new file
- `e2e/auth/google-oauth.spec.ts` — new file
