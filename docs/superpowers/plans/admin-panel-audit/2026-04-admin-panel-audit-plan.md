# Admin Panel & Jury Flow — Complete Fix Plan (Expanded Scope)

## Context

Admin panel pages were restructured (Phases 6-8) but wiring broke across pages, hooks, and API functions. Additionally: jury flow has field-name mismatches, config.js creates hard-coded criteria dependencies, several features exist as UI shells without backend wiring, and import/export flows are partially built but disconnected. This plan covers all of it.

## Root Causes

1. **API function signatures don't match hook calling conventions** — hooks pass objects, API expects positional args
2. **Pages call non-existent hook methods** — names changed during refactor but not updated
3. **Pages use state-only helpers for CRUD** — `removeX()` is local state only, never hits DB
4. **Jury API field-name mismatch** — `getJurorEditState` returns wrong field names
5. **Hard-coded CRITERIA in config.js** — scoring/progress/submit calculations use static fallback instead of DB criteria
6. **UI shells without backend wiring** — PinBlockingPage, import buttons, analytics export, settings buttons

---

## PART A: Wiring Fixes (Admin CRUD + Jury Flow)

### A1. Admin API signatures (src/shared/api/admin/jurors.js)

| Fn | Current | Fix |
|----|---------|-----|
| `updateJuror(id, payload)` | Hook passes single row | Accept object, extract `id`/`jurorId` |
| `resetJurorPin(jurorId, periodId)` | Hook passes `{periodId, jurorId}` | Destructure from object |
| `setJurorEditMode(jurorId, periodId, enabled)` | Hook passes object | Destructure from object |
| `forceCloseJurorEditMode(jurorId, periodId)` | Hook passes object | Destructure from object |

### A2. Admin hook fixes

**useManagePeriods.js:**
- Fix `handleUpdateCriteriaConfig`: Change `(periodId, name, posterDate, config)` to `(periodId, config)` — currently passes `name` as config to API
- Fix `handleUpdateOutcomeConfig`: Same fix
- Add `handleDeletePeriod(periodId)`: `deletePeriod` API → `removePeriod` state → toast
- Add aliases: `updateCriteriaTemplate` → `handleUpdateCriteriaConfig`, `updateMudekTemplate` → `handleUpdateOutcomeConfig`
- Import `deletePeriod` from API

**useManageProjects.js:**
- Fix `loadProjects`: Add `viewPeriodIdRef`, use internally (callers don't pass periodId)
- Add `handleDeleteProject(projectId)`: `deleteProject` API → `removeProject` state → toast
- Import `deleteProject` from API

**useManageJurors.js:**
- Add `handleDeleteJuror(jurorId)`: `deleteJuror` API → `removeJuror` state → toast
- Export in return object

### A3. Admin page call-site fixes

**ProjectsPage.jsx:**
- Line 91: Pass periodId to `loadProjects()` (or no arg after ref fix)
- Line 149: `handleEditProject(id, {...})` → `handleEditProject({id, title, group_no, members})`
- Line 162: `catch {}` → `catch (e) { _toast.error(e?.message || "Could not save project."); }`
- Line 377: `removeProject()` → `await handleDeleteProject()` + toast

**JurorsPage.jsx:**
- Lines 274-279: `applyJurorPatch` → `handleEditJuror({jurorId, juror_name, affiliation})`, remove duplicate toast
- Line 288: `catch {}` → `catch (e) { _toast.error(...); }`
- Lines 301-328: Replace broken `handleResetPin` with hook's proper flow
- Lines 349-358: `removeJuror()` → `await handleDeleteJuror()` + toast

**PeriodsPage.jsx:**
- Line 160: `catch {}` → `catch (e) { _toast.error(...); }`
- Line 187: `handleUpdatePeriod(id, {...})` → `handleUpdatePeriod({id, name, poster_date})`
- Line 198: `catch {}` → `catch (e) { _toast.error(...); }`
- Line 458: `removePeriod()` → `await handleDeletePeriod()` + toast

### A4. Jury API field mapping

**juryApi.js:133 `getJurorEditState`:**
Map response to match hook expectations:
```js
return {
  edit_allowed: data.edit_enabled,
  lock_active: data.is_blocked,
  last_seen_at: data.last_seen_at,
  final_submitted_at: data.final_submitted_at,
};
```

### A5. Jury workflow criteria fix

**useJuryWorkflow.js:** Accept `effectiveCriteria` as param, replace all `CRITERIA` usage:
- `totalFields = projects.length * effectiveCriteria.length`
- `countFilled(scores, projects, effectiveCriteria)`
- `isAllFilled(scores, p.project_id, effectiveCriteria)`

**useJuryState.js:** Pass `handlers.effectiveCriteria` to `useJuryWorkflow`

### A6. DoneStep Edit Scores button

**DoneStep.jsx:** Add conditional "Edit Scores" button when `state.editAllowed === true`, wired to `state.handleEditScores`

---

## PART B: config.js Elimination

### B1. Full repo-wide CRITERIA/TOTAL_MAX/APP_CONFIG consumer audit (20+ source files)

**Admin pages (5):**

| File | Imports | Usage |
|------|---------|-------|
| HeatmapPage.jsx | CRITERIA | Tab definitions + `criteriaConfig \|\| CRITERIA` fallback |
| AnalyticsPage.jsx | CRITERIA | Outcome map + chart loops + hardcoded threshold 70 |
| ReviewsPage.jsx | CRITERIA | `criteriaConfig = CRITERIA` default param |
| RankingsPage.jsx | CRITERIA | `criteriaConfig = CRITERIA` default param |
| ExportPage.jsx | (indirect) | Via exportXLSX |

**Admin hooks/utils (5):**

| File | Imports | Usage |
|------|---------|-------|
| scoreHelpers.js | CRITERIA | `getCellState(entry, criteria = CRITERIA)` default |
| useHeatmapData.js | CRITERIA | `criteriaConfig \|\| CRITERIA` fallback |
| useGridSort.js | TOTAL_MAX | `SCORE_FILTER_MAX = TOTAL_MAX` |
| useReviewsFilters.js | CRITERIA, TOTAL_MAX | `buildScoreCols(criteria = CRITERIA)`, `SCORE_FILTER_MAX = TOTAL_MAX` |
| exportXLSX.js | CRITERIA | `activeCriteria = criteria \|\| CRITERIA` fallback |

**Admin analytics/criteria (3):**

| File | Imports | Usage |
|------|---------|-------|
| analyticsDatasets.js | CRITERIA | `OUTCOMES` derivation, color lookup, criterion lookup |
| criteriaFormHelpers.js | CRITERIA | Criterion label/config lookup for form defaults |
| criteriaHelpers.js | CRITERIA | `getActiveCriteria()` fallback when no config |
| defaults.js | CRITERIA | Default template builder from CRITERIA |

**Charts (4):**

| File | Imports | Usage |
|------|---------|-------|
| GroupAttainmentHeatmap.jsx | CRITERIA | Column header rendering |
| ThresholdGapChart.jsx | CRITERIA | Data mapping per criterion |
| ProgrammeAveragesChart.jsx | CRITERIA | Bar data per criterion |
| JurorConsistencyHeatmap.jsx | CRITERIA | Column layout |

**Jury (4):**

| File | Imports | Usage |
|------|---------|-------|
| useJuryWorkflow.js | CRITERIA | `totalFields`, `countFilled`, `isAllFilled` |
| scoreState.js | CRITERIA | 6 functions with `criteria = CRITERIA` default |
| scoreSnapshot.js | CRITERIA | `buildScoreSnapshot` default param |
| progress.js | CRITERIA | Progress calculation, `criteriaTotalCount` |

**Tests (4):** a11y.test.jsx, useJuryState.test.js, useJuryState.writeGroup.test.js, HeatmapPage.aria.test.jsx — mock CRITERIA

### B2. Plan

**Keep (move to `src/shared/constants.js`):**
- `BAND_COLORS` — pure styling, no DB source
- `RUBRIC_EDITOR_TEXT` — UI placeholder text
- `RUBRIC_DEFAULT_LEVELS` — default band labels for new criteria creation
- `MUDEK_OUTCOMES` — reference data (bilingual outcome descriptions)
- `MUDEK_THRESHOLD` — accreditation threshold (until per-period config exists)

**Remove entirely:**
- `CRITERIA` array — all consumers must use `criteria_config` from the period
- `TOTAL_MAX` derived constant — compute from period criteria at runtime
- `getCriterionById` helper — use criteria from props/context
- `APP_CONFIG.showStudents` — unused

### B3. Consumer migration (all 20+ source files)

**Admin pages (5):**

1. **HeatmapPage.jsx**: Build tabs from `criteriaConfig` prop. Remove `CRITERIA` import + `|| CRITERIA` fallback.
2. **AnalyticsPage.jsx**: Use `criteriaConfig` from props. Replace `ATTAINMENT_THRESHOLD = 70` with `MUDEK_THRESHOLD`.
3. **ReviewsPage.jsx**: Change `criteriaConfig = CRITERIA` default to required param.
4. **RankingsPage.jsx**: Already uses `criteriaConfig` param — remove `CRITERIA` import.
5. **ExportPage.jsx**: Passes criteria through to exportXLSX — no direct fix needed.

**Admin hooks/utils (5):**

6. **scoreHelpers.js**: Make `criteria` required param in `getCellState` and `getPartialTotal`. Remove default.
7. **useHeatmapData.js**: Remove `|| CRITERIA` fallback, make `criteriaConfig` required.
8. **useGridSort.js**: Accept `totalMax` as hook param, remove `TOTAL_MAX` import.
9. **useReviewsFilters.js**: Accept `criteria` param in `buildScoreCols`, `buildScoreMaxByKey`, `useReviewsFilters`. Remove `CRITERIA`/`TOTAL_MAX` imports.
10. **exportXLSX.js**: Make `criteria` required param in export functions. Remove `|| CRITERIA` fallback.

**Analytics/criteria (4):**

11. **analyticsDatasets.js**: Accept `criteria` as function param. Remove `CRITERIA` import.
12. **criteriaFormHelpers.js**: Accept criteria from caller. Remove `CRITERIA` import.
13. **criteriaHelpers.js** (`getActiveCriteria`): Return `null`/empty when no config instead of falling back to CRITERIA. Callers must handle empty state.
14. **defaults.js**: Accept criteria array as param or import from constants (for seed defaults only).

**Charts (4):**

15. **GroupAttainmentHeatmap.jsx**: Accept `criteria` prop. Remove `CRITERIA` import.
16. **ThresholdGapChart.jsx**: Accept `criteria` prop. Remove `CRITERIA` import.
17. **ProgrammeAveragesChart.jsx**: Accept `criteria` prop. Remove `CRITERIA` import.
18. **JurorConsistencyHeatmap.jsx**: Accept `criteria` prop. Remove `CRITERIA` import.

**Jury (4):**

19. **useJuryWorkflow.js**: Accept `effectiveCriteria` param (covered in A5).
20. **scoreState.js**: Make `criteria` required in all 6 functions. Remove `CRITERIA` default.
21. **scoreSnapshot.js**: Make `criteria` required in `buildScoreSnapshot`. Remove default.
22. **progress.js**: Accept `criteria` param. Remove `CRITERIA` import.

**Tests (4):**

23-26. Update mocks: tests already mock `CRITERIA` — update import paths from `@/config` to `@/shared/constants` or remove mocks if no longer needed.

**After migration:** Delete `CRITERIA`, `TOTAL_MAX`, `getCriterionById`, `APP_CONFIG` from config.js. Move remaining constants to `src/shared/constants.js`. Delete `src/config.js` if empty.

### B4. Criteria config prop threading

AdminLayout already loads periods with `criteria_config`. Need to ensure it passes `criteriaConfig` to all score-related pages:
- OverviewPage, RankingsPage, AnalyticsPage, HeatmapPage, ReviewsPage

Check `AdminLayout.jsx` to see if `selectedPeriod?.criteria_config` is passed to these pages. If not, add it.

---

## PART C: PinBlockingPage Implementation

### C1. Backend assessment

**Table name:** `juror_period_auth` (confirmed in `sql/migrations/004_periods_and_execution.sql`). No `juror_semester_auth` table exists in the DB — it only appears in some docs as an outdated reference. All code correctly uses `juror_period_auth`.

**Already exists in DB:**

- `juror_period_auth.is_blocked` — admin manual block
- `juror_period_auth.failed_attempts` — PIN failure counter
- `juror_period_auth.locked_until` — auto-lockout expiry
- `juror_period_auth.locked_at` — lockout start
- `rpc_jury_verify_pin` — auto-locks after 3 failures (15 min)
- `rpc_juror_unlock_pin(p_period_id UUID, p_juror_id UUID)` — confirmed in `sql/migrations/007_auth_and_tokens.sql:617`. Admin manual unlock: clears `failed_attempts`, `locked_until`, `locked_at`.

**Missing API wrapper:**

- `unlockJurorPin({jurorId, periodId})` in `src/shared/api/admin/jurors.js` — calling `rpc_juror_unlock_pin`

**Threshold discrepancy:** UI shows 5 attempts, DB uses 3 (`rpc_jury_verify_pin` line 222: `IF v_failed_count >= 3`). Decision: use DB value (3).

### C2. Implementation

1. **Add API function** `unlockJurorPin` in `admin/jurors.js` calling `rpc_juror_unlock_pin`
2. **Add API function** `listLockedJurors(periodId)` — query `juror_period_auth` where `locked_until > now() OR is_blocked = true`
3. **Create hook** `usePinBlocking({ organizationId, selectedPeriodId })`:
   - `loadLockedJurors()` → fetch locked/blocked jurors for current period
   - `handleUnlock(jurorId)` → call `unlockJurorPin` → refresh → toast
   - State: `lockedJurors`, `loading`, `error`
4. **Rewrite PinBlockingPage.jsx:**
   - Accept `organizationId`, `selectedPeriodId` props from AdminLayout
   - Use `usePinBlocking` hook
   - Show real KPIs: Currently Locked count, Fail Threshold (3), Auto Unlock (15m)
   - Render locked jurors table with Unlock button per row
   - Policy snapshot with actual DB values
   - Unlock All button → iterate all locked jurors

---

## PART D: Import CSV Activation

### D1. Current state (90% built)

- Modal components exist: `ImportCsvModal.jsx`, `ImportJurorsModal.jsx`
- Hook handlers exist: `handleImportJurors`, `handleImportProjects`
- Missing: file upload + CSV parsing + button wiring

### D2. Implementation

1. **Add dependency**: `npm install papaparse` (lightweight CSV parser)
2. **Create utility**: `src/admin/utils/csvParser.js`
   - `parseProjectsCsv(file)` → returns `{ rows, stats, warnings }`
   - `parseJurorsCsv(file)` → returns `{ rows, stats, warnings }`
   - Validate required columns, detect duplicates
3. **Wire ProjectsPage.jsx Import button:**
   - Add file input ref + state for import modal
   - onClick → open file picker → parse CSV → show ImportCsvModal
   - Modal onImport → call `projects.handleImportProjects(rows)`
4. **Wire JurorsPage.jsx Import button:**
   - Same pattern with ImportJurorsModal
   - Modal onImport → call `jurorsHook.handleImportJurors(rows)`
5. **Add drag-drop zone** (optional, nice-to-have): within import modals

---

## PART E: Export Fixes

### E1. AnalyticsPage export activation

`buildAnalyticsWorkbook()` already exists in `src/admin/analytics/analyticsExport.js`.

1. Wire Download button in AnalyticsPage:
   - Remove `disabled` attribute
   - Add `onClick={handleExport}`
2. Implement `handleExport`:
   - Gather analytics data from page state
   - Call `buildAnalyticsWorkbook(data)`
   - Use `buildExportFilename("analytics", periodName, "xlsx")` for filename
   - Dynamic import `xlsx-js-style`, call `XLSX.writeFile`
   - Add try/catch + success/error toast
3. CSV/PDF format: defer to v2 (mark with "Coming soon" label in format selector)

### E2. ExportPage fixes

- Line 212: Fix label "Download .csv" → "Download .xlsx" (actual format)
- `handleExportProjects` (lines 65-94): Wire to the third export card or remove dead code. Decision: wire it as a "Projects" export option.

### E3. Score pages export feedback

- **RankingsPage.jsx**: Add success toast after `handleExport`
- **ReviewsPage.jsx**: Add try/catch + toast to `handleExport`
- **HeatmapPage.jsx**: Add success toast after `handleDownload`

---

## PART F: SettingsPage Disabled Buttons

### F1. Strategy

For buttons with no backend: remove from UI or show clear "Not available" state with tooltip/explanation. Don't show misleading clickable-looking but disabled buttons without context.

### F2. Implementation

**Remove from render (no backend, no near-term plan):**
- Platform Governance section (6 buttons: Global Settings, Audit Center, Export & Backup, Maintenance, Feature Flags, System Health)
- Danger Zone buttons (Disable Organization, Revoke Admin Access, Start Maintenance Mode)

**Keep but add "Not available" tooltip:**
- Security Policy button → tooltip: "Organization security policies — coming soon"
- View Sessions → tooltip: "Session management — coming soon"
- Sign Out All → tooltip: "Force logout — coming soon"

**Wire to existing functionality:**
- Export Memberships → use existing `listOrganizations` data to export member list as XLSX
- Leave Organization → add handler with confirmation dialog (removes membership)

---

## PART G: Toast / Feedback Matrix

Every CRUD action after fixes:

| Action | Success | Error |
|--------|---------|-------|
| Add project | Hook toast | Hook `setPanelError` |
| Edit project | Hook toast | Page catch toast |
| Delete project | Hook toast | Page catch toast |
| Import projects | Hook toast (with skip count) | Modal error display |
| Add juror | Hook toast | Hook `setPanelError` |
| Edit juror | Hook toast | Page catch toast |
| Delete juror | Hook toast | Page catch toast |
| Import jurors | Hook toast (with skip count) | Modal error display |
| Reset PIN | Hook toast | Hook `setPanelError` |
| Add period | Hook toast | Hook `setPanelError` |
| Edit period | Hook toast | Page catch toast |
| Delete period | Hook toast | Page catch toast |
| Save criteria | Page toast | Page `setPanelError` |
| Save outcomes | Page toast | Page `setPanelError` |
| Unlock PIN | Hook toast | Page catch toast |
| Generate token | Page toast | Page error display |
| Revoke token | Page toast | Page error display |
| Export (any) | Success toast | Error toast |

---

## Files Modified (estimated 20+)

| # | File | Scope |
|---|------|-------|
| 1 | `src/config.js` | Remove CRITERIA, TOTAL_MAX, getCriterionById, APP_CONFIG |
| 2 | `src/shared/constants.js` | NEW — move BAND_COLORS, RUBRIC_*, MUDEK_* here |
| 3 | `src/shared/api/juryApi.js` | Map getJurorEditState response fields |
| 4 | `src/shared/api/admin/jurors.js` | Fix 4 signatures + add unlockJurorPin + listLockedJurors |
| 5 | `src/jury/hooks/useJuryWorkflow.js` | Accept effectiveCriteria, remove CRITERIA import |
| 6 | `src/jury/useJuryState.js` | Pass effectiveCriteria to useJuryWorkflow |
| 7 | `src/jury/steps/DoneStep.jsx` | Add Edit Scores button |
| 8 | `src/admin/hooks/useManagePeriods.js` | Fix criteria/outcome config + add delete + aliases |
| 9 | `src/admin/hooks/useManageProjects.js` | Fix loadProjects + add delete |
| 10 | `src/admin/hooks/useManageJurors.js` | Add delete handler |
| 11 | `src/admin/hooks/usePinBlocking.js` | NEW — PIN blocking hook |
| 12 | `src/admin/pages/ProjectsPage.jsx` | Fix call sites + wire import + feedback |
| 13 | `src/admin/pages/JurorsPage.jsx` | Fix call sites + wire import + feedback |
| 14 | `src/admin/pages/PeriodsPage.jsx` | Fix call sites + feedback |
| 15 | `src/admin/pages/PinBlockingPage.jsx` | Full rewrite with backend wiring |
| 16 | `src/admin/pages/SettingsPage.jsx` | Remove/fix disabled buttons |
| 17 | `src/admin/pages/AnalyticsPage.jsx` | Wire export + remove CRITERIA import |
| 18 | `src/admin/pages/ExportPage.jsx` | Fix label + wire handleExportProjects |
| 19 | `src/admin/pages/RankingsPage.jsx` | Export toast + remove CRITERIA if needed |
| 20 | `src/admin/pages/ReviewsPage.jsx` | Export error handling + remove CRITERIA |
| 21 | `src/admin/pages/HeatmapPage.jsx` | Export toast + remove CRITERIA |
| 22 | `src/admin/utils/scoreHelpers.js` | Make criteria required param |
| 23 | `src/admin/hooks/useHeatmapData.js` | Remove CRITERIA fallback |
| 24 | `src/admin/hooks/useGridSort.js` | Compute max from criteria param |
| 25 | `src/admin/utils/csvParser.js` | NEW — CSV parsing utility |
| 26 | `src/admin/layout/AdminLayout.jsx` | Pass criteriaConfig to score pages + PinBlocking props |

## PART H: Pre-Implementation Contract Audit Pass

Before writing any code, grep the entire `src/` directory for each pattern below and confirm zero unresolved instances remain after implementation:

| Pattern | Expected after fix |
|---------|-------------------|
| `import.*CRITERIA.*from.*config` | 0 source files (tests may mock) |
| `TOTAL_MAX` (from config) | 0 — computed at runtime |
| `APP_CONFIG` | 0 — deleted |
| `getCriterionById` | 0 — deleted |
| `catch {` with only comment inside (pages) | 0 — all replaced with toast/error |
| `removeProject(` in pages | 0 — replaced with `handleDeleteProject` |
| `removeJuror(` in pages | 0 — replaced with `handleDeleteJuror` |
| `removePeriod(` in pages | 0 — replaced with `handleDeletePeriod` |
| `applyJurorPatch(` in pages (for edit) | 0 — replaced with `handleEditJuror` |
| `\|\| CRITERIA` fallback | 0 — no config.js fallbacks |
| `criteria = CRITERIA` default | 0 — criteria always explicit |

Note: `removeProject`/`removeJuror`/`removePeriod` may still exist in hooks as state-only helpers (called internally after API success). The audit target is page-level usage that bypasses the API.

---

## PART I: Edit/Lock State Normalization (Jury Flow)

The edit/lock state in the jury flow must use a single normalized source throughout:

**Current problem:** `getJurorEditState` returns `{edit_enabled, is_blocked}` but hooks read `{edit_allowed, lock_active}`. This means `editAllowed` and `editLockActive` are always `false`, breaking:

- DoneStep: edit button never shown (J1 fix covers API mapping)
- EvalStep: period lock not enforced during scoring
- useJurySessionHandlers: `canEdit` check always fails on re-entry
- useJuryLifecycleHandlers: period lock check fails silently

**Fix approach (single normalized state):**

1. Fix API mapping (Part A4) — single source of truth at API boundary
2. `useJuryEditState` hook already manages `editAllowed` + `editLockActive` state — this is the normalized state owner
3. All consumers (DoneStep, EvalStep, lifecycle/session handlers) must read from this hook, not from raw API data
4. Verify: `editAllowed` → enables re-edit after submission; `editLockActive` → period-level evaluation lock
5. Add DoneStep "Edit Scores" button (Part A6) — conditional on `editAllowed` from normalized state

**Audit:** After fix, grep for `edit_enabled`, `is_blocked`, `edit_allowed`, `lock_active` in `src/jury/` — only `useJuryEditState.js` should read raw API fields; all other files should use the hook's state.

---

## Implementation Phases & Parity Tracker

### Phase breakdown

| Phase | Scope | Steps |
| ----- | ----- | ----- |
| Phase 1 | API layer fixes | A1, A4, B (API signatures + jury field mapping) |
| Phase 2 | Hook layer fixes | A2, A5, A6 (admin hooks + jury workflow) |
| Phase 3 | Page wiring fixes | A3 (all admin pages call-site fixes) |
| Phase 4 | config.js elimination | B1-B4 (all 20+ consumers migrated) |
| Phase 5 | PinBlockingPage impl | C1-C2 (API wrapper + hook + page rewrite) |
| Phase 6 | Import CSV activation | D1-D2 (parser + button wiring + modal) |
| Phase 7 | Export fixes | E1-E3 (analytics export + labels + toasts) |
| Phase 8 | Settings cleanup | F1-F2 (remove/fix disabled buttons) |
| Phase 9 | Contract audit + tests | H, regression tests |

---

## Engineering Rules (bu iş boyunca uygulanacak)

### 1. Tek payload kuralı

Page → Hook → API çağrılarında positional arg kullanılmaz. Her zaman tek obje payload:

```js
// YANLIŞ
await updateJuror(id, { juror_name, affiliation });
await resetJurorPin(jurorId, periodId);

// DOĞRU
await updateJuror({ id, juror_name, affiliation });
await resetJurorPin({ jurorId, periodId });
```

### 2. API runtime guard

Zorunlu alanlar eksikse sessiz fail yerine açık hata:

```js
export async function resetJurorPin({ jurorId, periodId }) {
  if (!jurorId || !periodId) throw new Error("resetJurorPin: jurorId and periodId required");
  // ...
}
```

### 3. False success yasağı

- Success toast yalnızca `await`'li API çağrısı başarıyla döndükten sonra gösterilir
- Page seviyesinde duplicate success toast olmaz — hook toast gösteriyorsa page tekrar göstermez
- `applyXPatch` gibi state-only helper'lar toast tetiklemez

### 4. Delete pattern standardı

Tüm delete akışları bu sırayı izler:

```text
1. API çağrısı (await deleteX(id))
2. Local state temizliği (removeX(id))
3. Success toast
```

Page katmanı doğrudan `removeX()` çağırmaz — her zaman `handleDeleteX()` üzerinden gider.

### 5. Required context guard

`selectedPeriodId`, `criteriaConfig`, `organizationId` gibi bağımlılıklar yoksa:

- Sayfa sessiz `return` yapmaz
- Empty state / disabled action / inline error feedback gösterir
- Butonlar `disabled` olur ve neden açıklanır

### 6. Config migration fallback yasağı

Sadece `|| CRITERIA` ve `criteria = CRITERIA` değil, şu pattern'ler de yasaklanır:

- `criteriaConfig || CRITERIA`
- `criteria = CRITERIA` default param
- `activeCriteria = criteria || CRITERIA`
- `getActiveCriteria(null)` → CRITERIA fallback
- Herhangi bir implicit config.js fallback

Tek config kaynağı: `period.criteria_config` (DB'den). Config yoksa explicit empty state.

### 7. Terminology mapping

Kodda `period`, DB/RPC'de bazı yerlerde `semester` kullanılıyor. Referans:

| Kod (JS) | DB table | DB column | RPC param |
| -------- | -------- | --------- | --------- |
| `period` / `periodId` | `periods` | `id` | `p_period_id` |
| `juror_period_auth` | `juror_period_auth` | — | — |
| `periodList` / `sortedPeriods` | `periods` | — | — |
| eski: `semester` | — | — | — (deprecated, bazı RPC'lerde hâlâ var) |

UI'da "Evaluation Period" / "Period" kullanılır, DB tablo adı `periods` ve `juror_period_auth`'dur. `juror_semester_auth` tablosu DB'de mevcut değildir.

### 8. Regresyon testleri

Bu kırıklar için küçük hedefli testler yazılacak:

- `getJurorEditState` field mapping: API response `{edit_enabled, is_blocked}` → hook state `{edit_allowed, lock_active}` dönüşümü
- `effectiveCriteria` ile workflow: custom criteria period'da `allComplete` ve `progressPct` doğru hesaplanıyor mu
- Delete handler'lar: `handleDeleteProject`, `handleDeleteJuror`, `handleDeletePeriod` gerçekten `deleteX` API fonksiyonunu çağırıyor mu
- `updateCriteriaTemplate` / `updateMudekTemplate` alias'ları: hook return'da mevcut, doğru API fonksiyonuna yönleniyor
- scoreState fonksiyonları: `criteria` param olmadan çağrılırsa hata veriyor (fallback yok)

---

## Parity Tracker

Bu tablo her phase sonunda güncellenir.

**Status:** ✅ Tamamlandı | ⚠️ Kısmen tamamlandı / dikkat gerekiyor | ⏳ Başlanmadı

**Scope:** DB = DB'den veri geliyor | CRUD = Tüm CRUD aksiyonlar çalışıyor | Toast = Feedback tutarlı | Config = config.js bağımlılığı kaldırıldı

| Area | DB | CRUD | Toast | Config | Status | Notes |
| ---- | -- | ---- | ----- | ------ | ------ | ----- |
| ProjectsPage | ✅ | ✅ | ✅ | ✅ | ✅ | Phase 1-3 + 4a complete |
| JurorsPage | ✅ | ✅ | ✅ | ✅ | ✅ | Phase 1-3 + 4a complete |
| PeriodsPage | ✅ | ✅ | ✅ | ✅ | ✅ | Phase 1-3 + 4a complete |
| CriteriaPage | ✅ | ✅ | ✅ | ✅ | ✅ | updateCriteriaTemplate alias wired; Phase 4a config clean |
| OutcomesPage | ✅ | ✅ | ✅ | ✅ | ✅ | updateMudekTemplate alias wired; Phase 4a config clean |
| PinBlockingPage | ✅ | ✅ | ✅ | — | ✅ | Phase 5 complete: real backend wiring, usePinBlocking hook, 3-attempt threshold |
| EntryControlPage | ✅ | ✅ | ✅ | — | ✅ | Working |
| AuditLogPage | ✅ | ✅ | ✅ | — | ✅ | Working |
| OverviewPage | ✅ | — | — | ✅ | ✅ | Phase 4a: config.js migration done |
| RankingsPage | ✅ | — | ✅ | ✅ | ✅ | Phase 7: export toast + try/catch added |
| AnalyticsPage | ✅ | — | ✅ | ✅ | ✅ | Phase 7: Download button wired, handleExport + toast added |
| HeatmapPage | ✅ | — | ✅ | ✅ | ✅ | Phase 7: export toast + try/catch added |
| ReviewsPage | ✅ | — | ✅ | ✅ | ✅ | Phase 7: export toast + try/catch added |
| ExportPage | ✅ | ✅ | ✅ | — | ✅ | Phase 7: Raw Data label fixed, Projects card added |
| SettingsPage | ✅ | ✅ | ✅ | — | ✅ | Phase 8: Platform Governance + Danger Zone removed; Export Memberships wired |
| Import CSV (Jurors) | — | ✅ | ✅ | — | ✅ | Phase 6 complete: csvParser + ImportJurorsModal wired |
| Import CSV (Projects) | — | ✅ | ✅ | — | ✅ | Phase 6 complete: csvParser + ImportCsvModal wired |
| Jury: Edit State | ✅ | — | — | — | ✅ | API field mapping fixed (A4) |
| Jury: Workflow | — | — | — | ✅ | ✅ | effectiveCriteria param replaces hardcoded CRITERIA |
| Jury: DoneStep | — | ✅ | — | — | ✅ | Edit Scores button added (A6) |
| Charts (4) | — | — | — | ✅ | ✅ | Phase 4a: all 4 charts migrated |
| scoreState/snapshot/progress | — | — | — | ✅ | ✅ | Phase 4b complete: criteria required param, no defaults |
| API admin/jurors.js | ✅ | — | — | — | ✅ | All 4 signatures fixed, guards added |
| config.js elimination (admin) | — | — | — | ✅ | ✅ | Phase 4a complete: 18 files migrated |

### Pre-implementation: Dosya yolu doğrulama

Implementasyondan önce plan içinde geçen tüm hedef dosya yolları repo ile birebir doğrulanacak. Taşınmış veya legacy kalan dosyalarda yanlış hedefe patch atılmayacak. Doğrulanacak kritik dosyalar:

- `src/jury/steps/DoneStep.jsx` — Edit Scores butonu eklenmeli
- `src/jury/steps/EvalStep.jsx` — effectiveCriteria rendering
- `src/jury/hooks/useJuryWorkflow.js` — CRITERIA kullanımı
- `src/jury/utils/scoreState.js` — CRITERIA default param
- `src/jury/utils/scoreSnapshot.js` — CRITERIA default param
- `src/jury/utils/progress.js` — CRITERIA import
- `src/shared/api/juryApi.js` — getJurorEditState
- `src/shared/api/admin/jurors.js` — 4 fonksiyon + unlock
- `src/admin/hooks/useManagePeriods.js` — criteria/outcome config + delete
- `src/admin/hooks/useManageProjects.js` — loadProjects + delete
- `src/admin/hooks/useManageJurors.js` — delete handler
- `src/admin/pages/*.jsx` — tüm page dosyaları
- `src/admin/analytics/analyticsDatasets.js` — CRITERIA import
- `src/charts/*.jsx` — 4 chart dosyası
- `src/admin/utils/exportXLSX.js` — CRITERIA import
- `src/admin/modals/ImportCsvModal.jsx` + `ImportJurorsModal.jsx` — mevcut mi?

### Empty-state kabul kriteri

`criteriaConfig`, `selectedPeriodId`, `organizationId` gibi zorunlu context eksikse:

- Crash olmayacak
- Sessiz no-op olmayacak
- Kullanıcı anlamlı empty state / disabled reason görecek
- Butonlar disabled olacak ve neden açıklanacak
- Veri bağımlı tablolar "No data — select a period" benzeri mesaj gösterecek

### Faz kapanış kuralı

Her phase sonunda şu 3 madde zorunludur (phase kapanmadan sonraki phase'e geçilmez):

1. **Parity tracker güncelleme**: İlgili satırlar ✅ veya ⚠️ olarak güncellenecek
2. **Grep audit çalıştırma**: Part H'deki pattern'ler tekrar kontrol edilecek
3. **Test borcu kapatma**: Kırılan test varsa aynı phase içinde düzeltilecek, sonraki phase'e borç bırakılmayacak

### Phase Parity Tracker

| Phase | Description | Dosya doğrulandı | Kod yazıldı | Testler geçiyor | Grep audit temiz | Parity güncellendi | Status |
| ----- | ----------- | ---------------- | ----------- | --------------- | ----------------- | ------------------ | ------ |
| Phase 1 | API layer fixes (admin + jury) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Phase 2 | Hook layer fixes | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Phase 3 | Page wiring fixes | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Phase 4a | config.js elimination (admin) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Phase 4b | config.js elimination (jury + tests) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Phase 5 | PinBlockingPage impl | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Phase 6 | Import CSV activation | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Phase 7 | Export fixes | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Phase 8 | Settings cleanup | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Phase 9 | Contract audit + tests | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## Verification

1. `npm test -- --run` — all existing tests pass
2. Admin CRUD: Projects/Jurors/Periods Add/Edit/Delete persist to DB with toast
3. Criteria/Outcomes: load from DB, save persists, no config.js fallback
4. Jury flow: editAllowed/lockActive reflect real DB state; custom criteria periods work
5. Import: CSV upload → preview modal → import → success toast
6. Export: all export buttons produce file + toast
7. PinBlockingPage: shows real locked jurors, unlock works
8. SettingsPage: no misleading disabled buttons
9. No file imports `CRITERIA` from config.js
10. All `catch {}` blocks replaced with visible error feedback

---

## Window Planlama (Sonnet Implementation)

9 phase, Sonnet context window kapasitesine göre **5 window**'a bölünmüştür.

| Window | Phases | Scope | Dosya sayısı | Gerekçe | Status | Notes |
| ------ | ------ | ----- | ------------ | ------- | ------ | ----- |
| Window 1 | Phase 1-3 | API + Hook + Page wiring | 14 | Birbirine bağımlı — API imzaları düzelmeden hook çalışmaz, hook düzelmeden page çalışmaz | ✅ | A1-A6 complete. 14 dosya, 300/300 test. Rapor: `implementation_reports/phase-1-3-implementation-summary.md` |
| Window 2 | Phase 4a | config.js elimination (admin) | ~18 | Pages, hooks, utils, charts — admin tarafı consumer migration | ✅ | 18 dosya, 301/301 test. Rapor: `implementation_reports/phase-4a-implementation-summary.md` |
| Window 3 | Phase 4b | config.js elimination (jury + tests) | ~10 | scoreState, progress, snapshot, workflow + 4 test dosyası | ✅ | 5 dosya, 301/301 test. useJuryScoreHandlers call-site fix. Rapor: `implementation_reports/phase-4b-implementation-summary.md` |
| Window 4 | Phase 5-6 | Yeni feature'lar | ~7 | PinBlocking (API + hook + page) + Import CSV (parser + wiring) | ✅ | 8 dosya + papaparse, 301/301 test. Rapor: `implementation_reports/phase-5-6-implementation-summary.md` |
| Window 5 | Phase 7-9 | Export + Settings + Final audit | ~6 | Analytics export, export labels, toasts, settings cleanup, grep audit, regresyon testleri | ✅ | 7 dosya + 2 test dosyası, 306/306 test. Rapor: `implementation_reports/phase-7-9-implementation-summary.md` |

### Window / Phase Tamamlanma Kuralları

**Status değerleri:** ✅ Tamamlandı | ⚠️ Kısmen tamamlandı / dikkat gerekiyor | ⏳ Başlanmadı

**Implementation rapor kuralı:** Her window tamamlandığında:

1. **Status** sütunu ✅ veya ⚠️ olarak güncellenir
2. **Notes** sütununa yapılan işlerin kısa özeti ve rapor referansı yazılır
3. Detaylı implementation raporu `docs/superpowers/plans/admin-panel-audit/implementation_reports/` altında ilgili phase adıyla kaydedilir:
   - Window 1 → `phase-1-3-implementation-summary.md`
   - Window 2 → `phase-4a-implementation-summary.md`
   - Window 3 → `phase-4b-implementation-summary.md`
   - Window 4 → `phase-5-6-implementation-summary.md`
   - Window 5 → `phase-7-9-implementation-summary.md`

**Rapor içeriği (her implementation summary dosyasında):**

- Değiştirilen dosyalar ve yapılan değişiklik özeti
- Grep audit sonuçları (Part H pattern'leri)
- Test sonuçları (`npm test -- --run` çıktısı)
- Parity tracker güncellemeleri
- Varsa kalan riskler veya ⚠️ notları
- Sonraki window için ön koşul durumu

### Window 1 — Phase 1-3: Wiring Fixes ✅

**Giriş koşulu:** Dosya yolları doğrulanmış ✅

**Çıkış koşulu:** Tümü karşılandı ✅

- ✅ Admin CRUD (Projects/Jurors/Periods) Add/Edit/Delete DB'ye persist ediyor
- ✅ Criteria/Outcomes save çalışıyor (alias'lar: `updateCriteriaTemplate`, `updateMudekTemplate`)
- ✅ Jury editAllowed/lockActive doğru DB state yansıtıyor (A4: API field mapping)
- ✅ DoneStep edit butonu görünüyor (A6: `state.editAllowed && ...`)
- ✅ Tüm catch blokları toast/error feedback veriyor
- ✅ `npm test -- --run` geçiyor (300/300)

**Tamamlanan tarih:** 2026-04-03

**Ek düzeltmeler (pre-existing regressions):**

- `src/App.jsx` — `?t=TOKEN` routing + localStorage admin restore
- `src/test/qa-catalog.json` — missing `010_landing_stats` entry

**Dosyalar (14 toplam):**

1. `src/shared/api/admin/jurors.js` — 4 imza + runtime guard
2. `src/shared/api/admin/periods.js` — updatePeriod single-object
3. `src/shared/api/juryApi.js` — getJurorEditState field mapping
4. `src/admin/hooks/useManagePeriods.js` — criteria/outcome fix + delete + alias
5. `src/admin/hooks/useManageProjects.js` — loadProjects ref + delete
6. `src/admin/hooks/useManageJurors.js` — delete handler
7. `src/jury/hooks/useJuryWorkflow.js` — effectiveCriteria param
8. `src/jury/useJuryState.js` — pass effectiveCriteria
9. `src/jury/steps/DoneStep.jsx` — Edit Scores button
10. `src/admin/pages/ProjectsPage.jsx` — 3 call-site fix + toast (2 delete path)
11. `src/admin/pages/JurorsPage.jsx` — 3 call-site fix + toast
12. `src/admin/pages/PeriodsPage.jsx` — 2 call-site fix + toast
13. `src/App.jsx` — pre-existing routing regression fix
14. `src/test/qa-catalog.json` — missing qa entry

### Window 2 — Phase 4a: config.js Elimination (Admin)

**Giriş koşulu:** Window 1 tamamlanmış, testler geçiyor

**Çıkış koşulu:**

- Admin tarafında hiçbir dosya `CRITERIA` veya `TOTAL_MAX` import etmiyor
- `criteriaConfig` prop olarak AdminLayout'tan tüm score page'lere geçiyor
- Tüm fallback pattern'ler (`|| CRITERIA`, `criteria = CRITERIA`) kaldırılmış
- `npm test -- --run` geçiyor

**Dosyalar:**

1. `src/admin/pages/HeatmapPage.jsx`
2. `src/admin/pages/AnalyticsPage.jsx`
3. `src/admin/pages/ReviewsPage.jsx`
4. `src/admin/pages/RankingsPage.jsx`
5. `src/admin/utils/scoreHelpers.js`
6. `src/admin/hooks/useHeatmapData.js`
7. `src/admin/hooks/useGridSort.js`
8. `src/admin/hooks/useReviewsFilters.js`
9. `src/admin/utils/exportXLSX.js`
10. `src/admin/analytics/analyticsDatasets.js`
11. `src/admin/criteria/criteriaFormHelpers.js`
12. `src/shared/criteria/criteriaHelpers.js`
13. `src/shared/criteria/defaults.js`
14. `src/charts/GroupAttainmentHeatmap.jsx`
15. `src/charts/ThresholdGapChart.jsx`
16. `src/charts/ProgrammeAveragesChart.jsx`
17. `src/charts/JurorConsistencyHeatmap.jsx`
18. `src/admin/layout/AdminLayout.jsx` — criteriaConfig prop threading

### Window 3 — Phase 4b: config.js Elimination (Jury + Tests + Cleanup)

**Giriş koşulu:** Window 2 tamamlanmış, testler geçiyor

**Çıkış koşulu:**

- Jury tarafında hiçbir dosya `CRITERIA` import etmiyor
- `src/config.js` silinmiş veya sadece `constants.js`'e taşınan static değerler kalmış
- Tüm test mock'ları güncellenmiş
- `src/shared/constants.js` oluşturulmuş (BAND_COLORS, RUBRIC_*, MUDEK_*)
- `npm test -- --run` geçiyor

**Dosyalar:**

1. `src/jury/utils/scoreState.js`
2. `src/jury/utils/scoreSnapshot.js`
3. `src/jury/utils/progress.js`
4. `src/config.js` → delete / strip
5. `src/shared/constants.js` — NEW
6. `src/shared/__tests__/a11y.test.jsx`
7. `src/jury/__tests__/useJuryState.test.js`
8. `src/jury/__tests__/useJuryState.writeGroup.test.js`
9. `src/admin/__tests__/HeatmapPage.aria.test.jsx`

### Window 4 — Phase 5-6: PinBlocking + Import CSV

**Giriş koşulu:** config.js elimination tamamlanmış

**Çıkış koşulu:**

- PinBlockingPage gerçek lockout verisi gösteriyor, unlock çalışıyor
- Import CSV butonları dosya seçim → parse → preview → import akışı çalışıyor
- `npm test -- --run` geçiyor

**Dosyalar:**

1. `src/shared/api/admin/jurors.js` — unlockJurorPin + listLockedJurors ekleme
2. `src/admin/hooks/usePinBlocking.js` — NEW
3. `src/admin/pages/PinBlockingPage.jsx` — full rewrite
4. `src/admin/layout/AdminLayout.jsx` — PinBlocking props
5. `src/admin/utils/csvParser.js` — NEW
6. `src/admin/pages/ProjectsPage.jsx` — import button wiring
7. `src/admin/pages/JurorsPage.jsx` — import button wiring
8. `package.json` — papaparse dependency

### Window 5 — Phase 7-9: Export + Settings + Final Audit

**Giriş koşulu:** Tüm önceki window'lar tamamlanmış

**Çıkış koşulu:**

- Analytics export çalışıyor (XLSX)
- ExportPage label düzeltilmiş, dead code temizlenmiş
- Tüm export butonları success toast veriyor
- SettingsPage misleading button'lar kaldırılmış/açıklanmış
- Part H grep audit temiz (11 pattern = 0 hit)
- Regresyon testleri yazılmış ve geçiyor
- Tüm parity tracker satırları ✅

**Dosyalar:**

1. `src/admin/pages/AnalyticsPage.jsx` — export handler wiring
2. `src/admin/pages/ExportPage.jsx` — label fix + dead code
3. `src/admin/pages/RankingsPage.jsx` — export toast
4. `src/admin/pages/ReviewsPage.jsx` — export error handling
5. `src/admin/pages/HeatmapPage.jsx` — export toast
6. `src/admin/pages/SettingsPage.jsx` — button cleanup
7. Test dosyaları — regresyon testleri
