# B5 — Flake sweep + CI gate (CLOSED)

**Sprint:** B5 (Session B)
**Date closed:** 2026-04-24
**Status:** Green — all MUST exit criteria met

---

## Exit criteria

| # | Criterion | Result |
|---|-----------|--------|
| 1 | Full suite `--workers=1`: 35/35 passed, 1 skipped (lifecycle) | PASS |
| 2 | `--repeat-each=3 --workers=1` on projects + periods + import: 21/21, 0 flakes | PASS |
| 3 | `.github/workflows/e2e.yml` created with PR + main push triggers, browser cache, artifact upload | PASS |

---

## MUST 1 — Flake sweep

### Root cause A — `usePageRealtime` missing `VITE_E2E` guard

**Symptom:** `periods.spec.ts:81` (delete) intermittently failed: after `confirmDelete()` the row reappeared (count remained 1).

**Trace:**
1. `periods.spec.ts:42` CREATE fires a Supabase realtime INSERT event on the `periods` table.
2. `usePageRealtime` (used by `useManagePeriods`) had **no** `VITE_E2E` guard, so it was active during tests.
3. INSERT event → 400ms debounce → `refreshPeriods()` starts a DB query.
4. Meanwhile `periods.spec.ts:81` DELETE runs: `deletePeriod(id)` → `removePeriod(id)` (optimistic), modal closes.
5. In-flight DB query from step 3 completes, returning a pre-delete snapshot → `setPeriodList(stale)` brings the row back.

**Fix:** Added `if (import.meta.env.VITE_E2E) return;` as the first guard in `usePageRealtime`'s `useEffect` — matching the pattern already used in `useAdminRealtime.js`.

```javascript
// src/admin/shared/usePageRealtime.js
export function usePageRealtime({ organizationId, channelName, subscriptions, deps = [] }) {
  useEffect(() => {
    if (import.meta.env.VITE_E2E) return; // ← added
    if (!organizationId) return;
    ...
```

`usePageRealtime` is used by `useManagePeriods`, `useManageJurors`, and `AuditLogPage`. All three are now guarded.

### Root cause B — `viewPeriodId` loading race in projects

**Symptom:** `projects.spec.ts:37` create test intermittently failed: `saveCreate()` timed out — drawer stayed open after clicking save.

**Trace:**
1. `waitForReady()` only checked `addBtn().toBeVisible()` — passes as soon as the toolbar renders.
2. `loadPeriods()` completes asynchronously and sets `viewPeriodId`.
3. If the drawer opens before `viewPeriodId` is set, `handleAddProject` hits the guard `if (!targetPeriodId) return { ok: false }` — save is a no-op, drawer stays open.

**Fix:**
1. Added `data-testid="projects-no-period"` to the "Select an evaluation period" placeholder in `ProjectsTable.jsx`. This placeholder renders **only** when `viewPeriodId` is falsy.
2. Updated `ProjectsPom.waitForReady()` to wait for the sentinel count to reach 0, confirming `viewPeriodId` is loaded.

```typescript
// e2e/poms/ProjectsPom.ts
noPeriodPlaceholder(): Locator { return this.byTestId("projects-no-period"); }

async waitForReady(): Promise<void> {
  await expect(this.addBtn()).toBeVisible();
  await expect(this.noPeriodPlaceholder()).toHaveCount(0, { timeout: 10000 });
}
```

### Verification

```
npx playwright test e2e/admin/periods.spec.ts e2e/admin/projects.spec.ts \
  e2e/admin/projects-import.spec.ts --workers=1 --repeat-each=3
# 21 passed, 3 skipped (lifecycle × 3), 0 failed
```

---

## MUST 2 — Tenant-admin spec

Already verified 3/3 in B4 session. `e2e/admin/tenant-admin.spec.ts` passes in full suite without changes.

---

## MUST 3 — CI gate

Created `.github/workflows/e2e.yml` with:

- **Triggers:** `push` to `main`, `pull_request` targeting `main`
- **Timeout:** 20 minutes
- **Caching:** npm (via `actions/setup-node` cache) + Playwright browser binary (keyed by Playwright version + OS)
- **Browser install:** `chromium --with-deps` on cache miss; `install-deps chromium` on hit
- **Env vars:** secrets for credentials + static non-secret fixture values inline
- **Artifacts:** `test-results/` (HTML report, JSON results, failure screenshots/videos) with 14-day retention

### Required GitHub secrets

| Secret | Value source |
|--------|-------------|
| `E2E_SUPABASE_URL` | `VITE_SUPABASE_URL` from `.env.e2e.local` |
| `E2E_SUPABASE_ANON_KEY` | `VITE_SUPABASE_ANON_KEY` from `.env.e2e.local` |
| `E2E_RPC_SECRET` | `VITE_RPC_SECRET` from `.env.e2e.local` |
| `E2E_ADMIN_PASSWORD` | `E2E_ADMIN_PASSWORD` from `.env.e2e.local` |
| `E2E_TENANT_ADMIN_PASSWORD` | `E2E_TENANT_ADMIN_PASSWORD` from `.env.e2e.local` |
| `E2E_DEMO_ENTRY_TOKEN` | `VITE_DEMO_ENTRY_TOKEN` from `.env.e2e.local` |

---

## Files changed

| File | Change |
|------|--------|
| `src/admin/shared/usePageRealtime.js` | Added `VITE_E2E` guard |
| `src/admin/features/projects/components/ProjectsTable.jsx` | Added `data-testid="projects-no-period"` to "no period" placeholder |
| `e2e/poms/ProjectsPom.ts` | `noPeriodPlaceholder()` locator + updated `waitForReady()` |
| `.github/workflows/e2e.yml` | New CI workflow |
| `docs/.../flake-log.md` | Both flakes marked FIXED with root-cause detail |
