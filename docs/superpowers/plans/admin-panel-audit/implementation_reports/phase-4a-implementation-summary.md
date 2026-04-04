# Phase 4a Implementation Summary

**Date:** 2026-04-03
**Branch:** `refactor/folder-restructure`
**Scope:** Phase 4a — config.js elimination (admin side)

---

## What Was Done

Phase 4a removed all direct `CRITERIA` and `TOTAL_MAX` imports from admin-side code. Admin components now receive criteria as a prop (`criteriaConfig`) threaded from `AdminPanel` through the component tree, with no config.js dependency on the admin side.

### Changed Files

#### `src/admin/hooks/useReviewsFilters.js`

Added `criteriaKey` string stabilization to prevent an infinite render loop introduced by the
criteria-threading change. When `ReviewsPage` passes `criteriaConfig={[]}` as a default prop,
React creates a new `[]` literal on every render call. Without stabilization, `useMemo` saw a
new reference each time (`[] !== []`), recalculated `scoreCols` / `scoreKeys` / `scoreMaxByKey`,
the `useEffect([scoreKeys, scoreMaxByKey])` fired, called `setScoreFilters`, triggered a
re-render, and the cycle repeated indefinitely.

Fix: serialize criteria content to a stable string key before memo dependencies:

```js
const criteriaKey = (currentCriteria || []).map((c) => `${c.id}:${c.max}`).join(",");

// eslint-disable-next-line react-hooks/exhaustive-deps
const scoreCols = useMemo(() => buildScoreCols(currentCriteria), [criteriaKey]);
// eslint-disable-next-line react-hooks/exhaustive-deps
const scoreKeys = useMemo(() => scoreCols.map((c) => c.key), [criteriaKey]);
// eslint-disable-next-line react-hooks/exhaustive-deps
const scoreMaxByKey = useMemo(() => buildScoreMaxByKey(currentCriteria), [criteriaKey]);
```

With an empty criteria array `criteriaKey === ""` regardless of reference identity, so the
memos only recalculate when criteria content actually changes.

#### `src/admin/selectors/filterPipeline.js`

`enrichRows` called `getCellState(row)` without criteria. Before Phase 4a, `getCellState`
defaulted to the module-level `CRITERIA` constant from config.js. After Phase 4a changed the
default to `[]`, every row was classified as `effectiveStatus: "empty"` (zero criteria →
`filledCount === 0` always → "empty"). Score Status filters ("scored", "partial") matched
zero rows.

Fix: added `criteria = []` as the 7th parameter and passed it to both `getCellState` calls:

```js
export function enrichRows(rows, projectMeta, jurorEditMap, groups, periodName, jurorFinalMap = new Map(), criteria = []) {
  // ...
  const cellSt = getCellState(row, criteria);  // was: getCellState(row)
  // ...
  effectiveStatus: getCellState(row, criteria),  // was: getCellState(row)
```

#### `src/admin/pages/ReviewsPage.jsx`

Updated `enriched` useMemo to pass `criteriaConfig` as the 7th argument:

```js
const enriched = useMemo(
  () => enrichRows(combinedData, projectMeta, jurorEditMap, groups, periodName, jurorFinalMap, criteriaConfig),
  [combinedData, projectMeta, jurorEditMap, groups, periodName, jurorFinalMap, criteriaConfig]
);
```

#### `src/admin/__tests__/ReviewsPage.test.jsx`

Added `MOCK_CRITERIA` constant and passed `criteriaConfig={MOCK_CRITERIA}` to `<ReviewsPage>`
in both `renderDetails()` and `renderDetails2()` helpers. Without this, the component received
`criteriaConfig={undefined}`, which fell through to `[]`, triggering the infinite loop and
causing all 9 tests in this file to hang.

#### `src/admin/__tests__/ReviewsPage.filter.test.jsx`

Same fix: added `MOCK_CRITERIA` and passed `criteriaConfig={MOCK_CRITERIA}` to `<ReviewsPage>`
in `renderMultiGroupDetails()`. Without this, all 3 phase-A filter tests hung.

---

## Grep Audit Results

Zero forbidden admin-side patterns after Phase 4a:

```text
import CRITERIA from config  →  0 hits in src/admin/
TOTAL_MAX imports             →  0 hits in src/admin/
|| CRITERIA                   →  0 hits in src/admin/
criteria = CRITERIA           →  0 hits in src/admin/
```

Remaining config.js imports in `src/jury/` (`scoreState.js`, `scoreSnapshot.js`, `progress.js`)
are Phase 4b scope and deliberately untouched.

---

## Test Results

```
Test Files  38 passed (38)
Tests      301 passed (301)
Duration   ~12s
```

All 301 tests pass with zero failures. No skipped or pending tests.

---

## Parity Tracker Updates

### Phase Parity Tracker

| Phase | Tests | Grep | Docs | Status |
|-------|-------|------|------|--------|
| Phase 4a | ✅ | ✅ | ✅ | ✅ Complete |

### Component Parity Tracker — Config Column

All admin-side pages and components updated to ✅:

- ProjectsPage ✅
- JurorsPage ✅
- PeriodsPage ✅
- CriteriaPage ✅
- OutcomesPage ✅
- OverviewPage ✅
- RankingsPage ✅
- AnalyticsPage ✅
- HeatmapPage ✅
- ReviewsPage ✅
- Charts (4) ✅
- config.js elimination (admin) ✅

### Window Planner

Window 2 updated to ✅ with notes: `18 dosya, 301/301 test. Rapor: implementation_reports/phase-4a-implementation-summary.md`

---

## Risks and Notes

### ⚠️ eslint-disable comments on criteriaKey memos

Three `// eslint-disable-next-line react-hooks/exhaustive-deps` comments were added in
`useReviewsFilters.js`. These are intentional: the lint rule would require listing
`currentCriteria` as a dependency, which re-introduces the reference instability that was
just fixed. The `criteriaKey` string correctly captures content changes; the eslint suppression
is the right call here and should not be removed without understanding why it was added.

### ⚠️ Phase 4b still pending

`src/jury/utils/scoreState.js`, `src/jury/utils/scoreSnapshot.js`, and
`src/jury/utils/progress.js` still import from config.js. These are jury-side utilities,
out of Phase 4a scope, and will be addressed in Phase 4b.

---

## Next Window Preconditions

Phase 4b (jury-side config.js elimination) can start immediately:

- All 301 admin-side tests passing ✅
- No forbidden admin-side config imports ✅
- `filterPipeline.js` and `useReviewsFilters.js` fully threaded ✅
- Jury-side files (`scoreState.js`, `scoreSnapshot.js`, `progress.js`) identified and isolated ✅
