# Phase A Implementation Report

**Date:** 2026-03-24
**Scope:** Architectural boundaries — no user-visible behavior changes

## 1. Summary

Phase A established clean architectural boundaries across four areas:

- **Selector layer** (A.2) — extracted pure data-shaping functions from components and hooks
- **Admin API split** (A.3) — decomposed the 946-line monolithic adminApi.js into 9 domain modules
- **SQL migration split** (A.4) — decomposed the 4090-line bootstrap SQL into 11 ordered migration files
- **Storage centralization** (A.5) — unified scattered localStorage/sessionStorage access behind typed modules

Safety tests (A.1) were written before any refactoring to lock current behavior. All 18 safety tests pass. The full test suite shows identical results (349 pass / 32 fail) to the pre-Phase A baseline — the 32 failures are pre-existing and unrelated.

Production build succeeds with zero import resolution errors.

## 2. Selector Layer

### Extracted selectors

| File | Functions | Extracted from |
|------|-----------|----------------|
| `src/admin/selectors/scoreSelectors.js` | `deriveScoreStatus`, `normalizeScoreRow` | `adminApi.js` inline mapper |
| `src/admin/selectors/gridSelectors.js` | `buildLookup`, `buildJurorFinalMap`, `filterCompletedJurors`, `computeGroupAverages`, `buildExportRowsData` | `useScoreGridData.js` useMemo blocks |
| `src/admin/selectors/filterPipeline.js` | `buildProjectMetaMap`, `buildJurorEditMap`, `deriveGroupNoOptions`, `generateMissingRows`, `enrichRows`, `applyFilters`, `sortRows`, `computeActiveFilterCount` | `ScoreDetails.jsx` 196-line useMemo |
| `src/admin/selectors/overviewMetrics.js` | `computeOverviewMetrics` (re-export) | `scoreHelpers.js` |

### Criteria modules

| File | Functions |
|------|-----------|
| `src/shared/criteria/criteriaHelpers.js` | `normalizeCriterion`, `criterionToTemplate`, `getActiveCriteria`, `templateToCriteria`, `normalizeSemesterCriteria`, `buildMudekLookup`, `pruneCriteriaMudekMappings` |
| `src/shared/criteria/defaults.js` | `defaultCriteriaTemplate`, `defaultMudekTemplate` |
| `src/shared/criteria/validation.js` | `isCriteriaScoreComplete`, `computeCriteriaTotal` |
| `src/shared/criteria/index.js` | Barrel re-export |

The original `src/shared/criteriaHelpers.js` is now a 3-line re-export shim.

### Before vs after

| Component | Before | After |
|-----------|--------|-------|
| `adminGetScores` | 44-line inline mapper | `(data).map(normalizeScoreRow)` |
| `useScoreGridData.js` | 5 inline useMemo computations | Thin hook delegating to 5 selector functions |
| `ScoreDetails.jsx` | 196-line useMemo block | Sequential calls to 8 pipeline functions |

## 3. API Refactor

### New module structure

```text
src/shared/api/
  transport.js         — callAdminRpc + rethrowUnauthorized
  admin/
    auth.js            — adminLogin, adminSecurityState
    semesters.js       — 6 semester CRUD functions
    projects.js        — 4 project CRUD functions
    jurors.js          — 6 juror management functions
    scores.js          — 9 score/data/settings functions
    passwords.js       — 6 password management functions
    export.js          — adminFullExport, adminFullImport
    tokens.js          — 3 entry token functions
    audit.js           — adminListAuditLogs
    index.js           — barrel re-export (40 functions)
  adminApi.js          — re-export shim (backward compat)
  index.js             — public API surface (unchanged)
```

All 40 previously-exported functions remain accessible from both `src/shared/api/index.js` and `src/shared/api/adminApi.js`. No function signatures or return shapes changed.

## 4. SQL Refactor

### New migration structure

| File | Content | Functions |
|------|---------|-----------|
| `sql/migrations/001_schema.sql` | Extensions, tables, constraints, indexes, view, migration phases | 0 |
| `sql/migrations/002_triggers.sql` | Trigger functions + bindings | 5 |
| `sql/migrations/003_rpc_helpers.sql` | Internal helper functions | 3 |
| `sql/migrations/004_rpc_semester.sql` | Semester RPCs | 6 |
| `sql/migrations/005_rpc_project.sql` | Project RPCs | 5 |
| `sql/migrations/006_rpc_juror.sql` | Juror RPCs | 9 |
| `sql/migrations/007_rpc_score.sql` | Score RPCs | 5 |
| `sql/migrations/008_rpc_admin_mgmt.sql` | Admin management RPCs | 18 |
| `sql/migrations/009_rpc_tokens.sql` | Token/PIN RPCs | 6 |
| `sql/migrations/010_grants_rls.sql` | GRANT + RLS statements | 0 |
| `sql/migrations/011_realtime.sql` | Supabase Realtime publication | 0 |
| `sql/schema_version.sql` | Version tracking table | 0 |

**Total:** 57 functions across 11 migration files (exact match with original).

The original `sql/000_bootstrap.sql` is preserved as the single-file reference, with one targeted fix (see below).

### Idempotency fix

During A.1 testing, the SQL idempotency test found that `rpc_admin_login` (line 1155) used bare `CREATE FUNCTION` instead of `CREATE OR REPLACE FUNCTION`. This was corrected in both `000_bootstrap.sql` and the corresponding migration file to ensure re-run safety. This is the only change to runtime SQL in Phase A.

## 5. Storage Refactor

### New storage modules

| File | Functions | Replaces |
|------|-----------|----------|
| `src/shared/storage/keys.js` | `KEYS` constant (8 keys) | Scattered string literals |
| `src/shared/storage/pageStorage.js` | `getPage`, `setPage` | Inline localStorage in App.jsx |
| `src/shared/storage/juryStorage.js` | `getJuryAccess`, `setJuryAccess`, `clearJuryAccess`, `getJurySessionKeys`, `clearJurySession` | Inline in App.jsx, JuryGatePage.jsx, useJuryHandlers.js |
| `src/shared/storage/adminStorage.js` | `readSection`, `writeSection`, `getRawToken`, `setRawToken`, `clearRawToken` | persist.js + inline in JuryEntryControlPanel.jsx |

### Files updated

- `src/App.jsx` — removed `JURY_ACCESS_KEY` constant, uses storage module
- `src/jury/JuryGatePage.jsx` — removed inline dual-storage writes, uses `setJuryAccess()`
- `src/jury/hooks/useJuryHandlers.js` — replaced inline `STORAGE_KEYS` with `getJurySessionKeys()`
- `src/admin/persist.js` — uses `KEYS.ADMIN_UI_STATE` instead of hardcoded string
- `src/admin/settings/JuryEntryControlPanel.jsx` — uses `getRawToken`/`setRawToken`/`clearRawToken`

## 6. Tests

### New tests added (A.1 safety suite)

| File | Tests | Coverage |
|------|-------|----------|
| `src/admin/__tests__/adminApi.shaping.test.js` | 5 | adminGetScores field mapping, status derivation, adminListJurors, adminProjectSummary, adminGetOutcomeTrends |
| `src/admin/__tests__/scoreHelpers.safety.test.js` | 3 | getCellState with custom criteria, getPartialTotal null handling, jurorStatusMeta completeness |
| `src/admin/__tests__/ScoreDetails.filter.test.jsx` | 3 | Multi-select filter AND logic, default pass-through, active filter count |
| `src/admin/__tests__/useScoreGridData.safety.test.jsx` | 3 | Custom criteriaTemplate lookup, workflow state transitions, buildExportRows mixed states |
| `src/__tests__/App.storage.test.jsx` | 3 | URL token routing, localStorage page restoration, jury_gate persistence skip |
| `sql/__tests__/idempotency.test.js` | 1 | SQL idempotency structural validation |

**Total:** 18 new tests across 6 files, 18 qa-catalog entries added.

### Test suite results

- **Before Phase A:** 349 pass / 32 fail (8 files)
- **After Phase A:** 349 pass / 32 fail (8 files) — identical
- **No new failures introduced by Phase A.**
- **All 18 Phase A safety tests pass.**
- **Full suite is not yet fully green.** 32 pre-existing failures remain in 8 files: a11y, PinResetDialog, ManageJurorsPanel, ManageProjectsPanel, ManageSemesterPanel, useJuryState (x2), useDeleteConfirm. These failures predate Phase A and are unrelated to the refactoring.

## 7. Risks / Notes

1. **Shim files are load-bearing**: `adminApi.js` and `criteriaHelpers.js` are now re-export shims. Future cleanup should migrate consumers to the new paths before removing shims.

2. **`adminDeleteEntity` cross-domain import**: Lives in `scores.js` but imports delete functions from `semesters.js`, `projects.js`, `jurors.js`. This is architecturally sound but creates a dependency from scores → other domains.

3. **Pre-existing test failures**: 32 tests across 8 files were failing before Phase A. These are unrelated to the refactoring and should be addressed separately.

4. **SQL migration ordering**: Files 001→011 must be run in order. 003 depends on 001 (table references). 004–009 depend on 003 (helper functions). 010 depends on all functions existing.

5. **`_codeToId` promoted to named export**: The previously-private `_codeToId` function in criteriaHelpers.js was promoted to a named export so `defaults.js` can import it. The underscore convention signals it's internal.

## 8. Deviations from Master Plan

Phase A's core architectural goals were achieved. The following items deviate from strict master-plan wording and are documented here so Phase B starts from an honest baseline.

1. **Pre-existing test failures remain.** 32 tests across 8 files were failing before Phase A began. Phase A introduced zero new failures and these pre-existing issues are outside its scope. They should be addressed separately.

2. **Re-export shims preserved for backward compatibility.** The master plan calls for clean module boundaries. In practice, `src/shared/api/adminApi.js` and `src/shared/criteriaHelpers.js` were converted to thin re-export shims rather than being removed. This was intentional — many consumers import from these paths, and removing them would have required a consumer migration that exceeds Phase A's "no behavior change" scope. Shim removal is deferred to future cleanup.

3. **Original bootstrap SQL preserved alongside migrations.** `sql/000_bootstrap.sql` was kept unmodified as a reference artifact. The 11 migration files in `sql/migrations/` contain the same content, split by domain. The bootstrap file is not deleted because it serves as the single-file deployment fallback and diff baseline.

4. **`_codeToId` promoted to named export.** The previously-private helper in `criteriaHelpers.js` was promoted to a named export so `criteria/defaults.js` could import it. This is a minor API surface change; the underscore convention signals it remains internal.

5. **`rpc_admin_login` idempotency fix.** During A.1 testing, a bare `CREATE FUNCTION` was found at line 1155 of `000_bootstrap.sql`. This was corrected to `CREATE OR REPLACE FUNCTION`. This is the only change to runtime SQL in Phase A.

## 9. Verification Checklist

- [x] No new failures introduced by Phase A (pre/post suite results identical: 349 pass / 32 fail)
- [x] All 18 Phase A safety tests passing
- [ ] Full test suite fully green — 32 pre-existing failures remain (outside Phase A scope)
- [x] Selectors used instead of inline logic
- [x] API split completed (9 domain modules + transport + barrel)
- [x] SQL split completed (11 migration files + schema_version)
- [x] Storage centralized (4 modules + keys constant)
- [x] Production build succeeds with zero import resolution errors
- [x] All shim files preserve backward compatibility
- [x] Original `000_bootstrap.sql` preserved unmodified (except idempotency fix)

## 10. Phase A Closure

Phase A is complete in its core scope. The four architectural boundary goals — selectors, API split, SQL split, and storage centralization — are fully implemented and verified. No user-visible behavior, UI, DB schema, or Supabase RPC contracts were changed.

Items intentionally deferred: shim removal (requires consumer migration), pre-existing test fixes (unrelated to Phase A), bootstrap SQL deletion (kept as reference). These are not hidden gaps — they are explicit choices documented in Section 8 above.

Phase B should start from this corrected baseline.
