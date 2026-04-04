# Phase 1–3 Implementation Summary

**Date:** 2026-04-03
**Branch:** `refactor/folder-restructure`
**Scope:** A1–A6 (Phase 1: API layer, Phase 2: Hook layer, Phase 3: Page wiring fixes)

---

## What Was Done

### Phase 1 — API Layer (A1, A4)

**A1 — `src/shared/api/admin/jurors.js`**

All four admin juror API functions migrated to single-object payload pattern with runtime guards:

- `resetJurorPin({ jurorId, periodId })` — was positional; now single-object; guard throws if either missing; uses `rpc_jury_authenticate` with `p_force_reissue: true` (not a non-existent `rpc_admin_reset_juror_pin`)
- `setJurorEditMode({ jurorId, periodId, enabled })` — same fix
- `forceCloseJurorEditMode({ jurorId, periodId })` — same fix
- `getJurorEditState({ jurorId, periodId })` — same fix

**A1 (prereq) — `src/shared/api/admin/periods.js`**

`updatePeriod` changed from `(id, payload)` positional to `({ id, name, season, ... })` single-object with `if (!id) throw` guard. Needed for A3 (PeriodsPage call-site fix).

**A4 — `src/shared/api/juryApi.js`**

`getJurorEditState` response mapped from raw DB field names to hook-expected names at the API boundary:

```js
return {
  edit_allowed: data.edit_enabled,
  lock_active:  data.is_blocked,
  last_seen_at: data.last_seen_at,
  final_submitted_at: data.final_submitted_at,
};
```

This fixes `editAllowed` and `editLockActive` always being `false` in the jury flow.

---

### Phase 2 — Hook Layer (A2, A5, A6)

**A2 — `src/admin/hooks/useManagePeriods.js`**

- `handleUpdateCriteriaConfig(periodId, config)` — signature reduced to 2 args (was 4, passing wrong value as `config`)
- `handleUpdateOutcomeConfig(periodId, config)` — same fix
- `handleDeletePeriod(periodId)` — new handler: API call → local state removal → success toast; catch shows error panel
- Aliases added to return: `updateCriteriaTemplate`, `updateMudekTemplate`

**A2 — `src/admin/hooks/useManageProjects.js`**

- `viewPeriodIdRef` added so `loadProjects()` (no-arg call from pages) falls back to `viewPeriodIdRef.current`
- `handleDeleteProject(projectId)` — new handler: API call → `removeProject` → success toast; catch shows error panel

**A2 — `src/admin/hooks/useManageJurors.js`**

- `handleDeleteJuror(jurorId)` — new handler: API call → `removeJuror` → success toast; catch shows error panel

**A5 — `src/jury/hooks/useJuryWorkflow.js`**

Removed hardcoded `import { CRITERIA } from "../../config"`. Hook now accepts `effectiveCriteria` param (passed from orchestrator). `criteria = effectiveCriteria || []` — no static fallback.

**A5 — `src/jury/useJuryState.js`**

Added `import { deriveEffectiveCriteria } from "./hooks/juryHandlerUtils"`. After `loading = useJuryLoading()`, computes `effectiveCriteria = deriveEffectiveCriteria(loading.criteriaConfig)` and passes it to `useJuryWorkflow`. Avoids circular dependency (workflow is called before handlers in composition order).

**A6 — `src/jury/steps/DoneStep.jsx`**

Added conditional "Edit Scores" button before the Exit button:

```jsx
{state.editAllowed && (
  <button className="dj-btn-secondary" onClick={state.handleEditScores} style={{ width: "100%" }}>
    Edit Scores
  </button>
)}
```

---

### Phase 3 — Page Wiring (A3)

**`src/admin/pages/ProjectsPage.jsx`**

- `handleEditProject` call-site fixed to single-object: `{ id, title, group_no, members }`
- Edit catch block: `catch (e) { _toast.error(e?.message || "Could not save project."); }`
- Table delete action: `projects.handleDeleteProject(project.id)` (was `removeProject`)
- Drawer delete action: `projects.handleDeleteProject(t.id)` (was `removeProject`) — this second path was found during Part H grep audit

**`src/admin/pages/PeriodsPage.jsx`**

- `handleUpdatePeriod` call-site fixed to single-object: `{ id, name, poster_date }`
- Both catch blocks show toast
- Delete action: `periods.handleDeletePeriod(period.id)` (was `removePeriod`)

**`src/admin/pages/JurorsPage.jsx`**

- Edit save: replaced broken `jurorsHook.applyJurorPatch({...})` with `jurorsHook.handleEditJuror({ jurorId, juror_name, affiliation })`
- PIN reset: replaced entire broken dynamic-import implementation with `jurorsHook.requestResetPin(pinResetJuror)`
- Delete action: `jurorsHook.handleDeleteJuror(juror_id)` (was `removeJuror`)
- All catch blocks show toast

---

## Pre-existing Regressions Fixed

Two pre-existing test failures found in the branch (not caused by Phase 1-3 work):

1. **`App.jsx` routing** — `readInitialPage()` only checked `?eval=` for jury_gate but `readToken()` reads `?t=`. Added `params.get("t")` to routing check so QR-code URLs still work.

2. **`App.jsx` localStorage restore** — Only `"jury"` was restored from localStorage; `"admin"` fell through to `"home"`. Added `"admin"` to the restore guard.

3. **`sql/__tests__/idempotency.test.js`** — New migration `010_landing_stats.sql` had no qa-catalog entry. Added `phaseA.sql.migration.010_landing_stats`.

---

## Test Results

```
Test Files  38 passed (38)
     Tests  300 passed (300)
  Duration  ~4s
```

All 300 tests pass.

---

## Part H Grep Audit Results (Phase 1-3 scope)

| Pattern | Result |
|---------|--------|
| `removeProject(` in pages | ✅ 0 hits |
| `removeJuror(` in pages | ✅ 0 hits |
| `removePeriod(` in pages | ✅ 0 hits |
| `applyJurorPatch(` in pages | ✅ 0 hits |
| Silent `catch {}` in pages (user actions) | ✅ 0 hits (remaining are date-format fallbacks) |
| `import.*CRITERIA.*from.*config` | ⏳ Phase 4 scope |
| `\|\| CRITERIA` fallback | ⏳ Phase 4 scope |
| `criteria = CRITERIA` default | ⏳ Phase 4 scope |
| `TOTAL_MAX`, `APP_CONFIG`, `getCriterionById` | ⏳ Phase 4 scope |

---

## Files Modified

| File | Change |
|------|--------|
| `src/shared/api/admin/jurors.js` | A1: All 4 signatures → single-object + guards |
| `src/shared/api/admin/periods.js` | A1 prereq: `updatePeriod` → single-object |
| `src/shared/api/juryApi.js` | A4: `getJurorEditState` response field mapping |
| `src/admin/hooks/useManagePeriods.js` | A2: criteria/outcome sig fix + `handleDeletePeriod` + aliases |
| `src/admin/hooks/useManageProjects.js` | A2: `viewPeriodIdRef` + `handleDeleteProject` |
| `src/admin/hooks/useManageJurors.js` | A2: `handleDeleteJuror` |
| `src/admin/pages/ProjectsPage.jsx` | A3: edit fix + delete fix (2 paths) |
| `src/admin/pages/PeriodsPage.jsx` | A3: update fix + delete fix |
| `src/admin/pages/JurorsPage.jsx` | A3: edit fix + PIN reset fix + delete fix |
| `src/jury/hooks/useJuryWorkflow.js` | A5: remove CRITERIA import, accept effectiveCriteria param |
| `src/jury/useJuryState.js` | A5: derive effectiveCriteria early, pass to workflow |
| `src/jury/steps/DoneStep.jsx` | A6: conditional Edit Scores button |
| `src/App.jsx` | Bugfix: `?t=` routing + localStorage admin restore |
| `src/test/qa-catalog.json` | Bugfix: add `phaseA.sql.migration.010_landing_stats` |

---

## Next: Phase 4 (Window 2)

config.js elimination — ~14 files to migrate (admin pages, hooks, utils, charts). See plan Part B.
