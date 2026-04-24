# A4 — Zero-Coverage Large Files

**Sprint:** Session A — Unit Test Coverage
**Date:** 2026-04-24
**Status:** Complete

---

## Scope

Goal: eliminate ≥ 15 zero-coverage files (149 → ≤ 134). Final result: **149 → 133** (16 files eliminated, target exceeded).

Three distinct batches were worked:

| Batch | Files covered | Zero-cov files eliminated |
|-------|--------------|--------------------------|
| Priority (5 large files) | GovernanceDrawers, LandingPage, adminTourSteps, analyticsExport, DemoAdminLoader | ~5 |
| Batch B (10 small components) | 6 × SortIcon, AvgDonut, SaveBar, ChartDataTable, StepperBar | ~8 |
| PeriodCells cleanup | ProgressCell, StatusPill, LifecycleBar | 3 |
| **Total** | | **16** |

---

## Priority Files

| File | Lines | Test file | Tests added |
|------|-------|-----------|-------------|
| `src/admin/GovernanceDrawers.jsx` | 1310 | `src/admin/__tests__/GovernanceDrawers.test.jsx` | key section render + prop passing |
| `src/landing/LandingPage.jsx` | 1184 | `src/landing/__tests__/LandingPage.test.jsx` | hero render + IntersectionObserver polyfill |
| `src/admin/adminTourSteps.js` | 103 | `src/admin/__tests__/adminTourSteps.test.js` | step count + required keys |
| `src/shared/api/analyticsExport.js` | 405 | `src/shared/api/__tests__/analyticsExport.test.js` | CSV header + row shape |
| `src/shared/ui/DemoAdminLoader.jsx` | 240 | `src/shared/ui/__tests__/DemoAdminLoader.test.jsx` | loading steps render + auth failure |

### DemoAdminLoader — key patterns

The most complex file in this batch. Required:

- **`vi.hoisted()`** for the `SIGN_IN` mock — the mock factory closes over it before module-level `const` declarations are evaluated
- **`beforeEach` reset pattern** — `SIGN_IN.mockReset()` + `mockImplementation()` between tests so the pending-forever and auth-failure behaviours don't bleed across
- **`waitFor`** for the async failure test — `Promise.reject()` resolves in a microtask after render

```js
const { SIGN_IN } = vi.hoisted(() => ({
  SIGN_IN: vi.fn(() => new Promise(() => {})),
}));

vi.mock("@/auth", () => ({ useAuth: () => ({ signIn: SIGN_IN }) }));

beforeEach(() => {
  SIGN_IN.mockReset();
  SIGN_IN.mockImplementation(() => new Promise(() => {}));
});
```

---

## Batch B — Small Component Coverage

New test file: `src/admin/__tests__/SortIcons.test.jsx`

| Component | Location | Tests |
|-----------|----------|-------|
| `SortIcon` (entry-control) | `entry-control/components/SortIcon` | inactive / active-asc / active-desc |
| `SortIcon` (jurors) | `jurors/components/SortIcon` | same 3 |
| `SortIcon` (organizations) | `organizations/components/SortIcon` | same 3 |
| `SortIcon` (periods) | `periods/components/SortIcon` | same 3 |
| `SortIcon` (projects) | `projects/components/SortIcon` | same 3 |
| `SortIcon` (rankings) | `rankings/components/SortIcon` | uses `field`/`sortField` props (different API) |

All 6 SortIcon variants were covered in a single file — each import triggers v8 coverage for that specific source file.

### Other batch B files

| File | New test file | Key assertion |
|------|---------------|---------------|
| `src/admin/shared/AvgDonut.jsx` | `src/admin/shared/__tests__/AvgDonut.test.jsx` | `aria-label` contains rounded value / "not available" |
| `src/admin/features/criteria/SaveBar.jsx` | `src/admin/features/criteria/__tests__/SaveBar.test.jsx` | null render when clean; "Unsaved changes" when dirty |
| `src/charts/chartUtils.jsx` | `src/charts/__tests__/chartUtils.test.jsx` | "View data table" summary; cell values rendered |
| `src/jury/shared/StepperBar.jsx` | `src/jury/shared/__tests__/StepperBar.test.jsx` | all step labels; `.active` CSS class on current step |

---

## PeriodCells Cleanup

After batch B the count was 136 (not 132 as estimated). Three more zero-coverage period components were found and covered in a single file.

New test file: `src/admin/features/periods/__tests__/PeriodCells.test.jsx`

| Component | Lines | Key assertions |
|-----------|-------|----------------|
| `ProgressCell` | ~43 | draft state → "—"; locked period → "75%" |
| `StatusPill` | ~25 | status "draft" → "Draft"; status "live" → "Live" |
| `LifecycleBar` | ~40 | segments text rendered; all-zero → null container |

---

## Errors and Fixes

### `window.matchMedia is not a function` (chartUtils)

jsdom does not implement `window.matchMedia`. `ChartDataTable` calls it inside `useEffect` for the prefers-reduced-motion check.

Fix — `beforeAll()` polyfill:

```js
beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }),
  });
});
```

### Coverage count 136 instead of 132 after batch B

Estimated 10 zero-coverage files would be eliminated by batch B; actual was 8. Two of the expected files had already been reached indirectly (likely via integration with a covered page). Resolved by writing the PeriodCells test file covering 3 additional files, reaching the final count of 133.

---

## Before / After Stats

| Metric | Post-A3 | Post-A4 | Delta |
|--------|---------|---------|-------|
| Test files | 160 | 171 | +11 |
| Total tests | 581 | 618 | +37 |
| Zero-coverage files | 149 | 133 | −16 |
| Statements | 41.77% | 45.55% | +3.78pp |
| Branches | 57.20% | 57.30% | +0.10pp |
| Functions | 31.41% | 33.56% | +2.15pp |
| Lines | 41.77% | 45.55% | +3.78pp |

Coverage values are from the "All files" v8 summary row.

---

## Patterns Used

- **`vi.hoisted()`** — for constants closed over by `vi.mock()` factories; required when mock factory references a value before module-scope `const` declarations are evaluated
- **Stable mock references (Rule 8)** — `vi.fn()` instances used as `useEffect`/`useMemo` deps must be hoisted outside factory; fresh objects on every factory call cause infinite render loops (documented in A3 as the PeriodsPage OOM root cause)
- **`beforeEach` reset + `mockImplementation`** — switching mock behaviour between tests without re-declaring the mock
- **`waitFor`** — for tests asserting on UI state that settles after a rejected promise
- **jsdom polyfills** — `window.matchMedia` for `ChartDataTable`; `IntersectionObserver` for `LandingPage`
- **Sibling mock paths (Rule 9)** — from `__tests__/`, sibling mocks use `"../Component"`, not `"./Component"`
- **Single file covering multiple source files** — `SortIcons.test.jsx` imports 6 variants; v8 credits each source file independently

---

## vite.config.js Thresholds

| Key | Post-A3 | Post-A4 | Notes |
|-----|---------|---------|-------|
| lines | 41 | 44 | ratcheted up; 45.55% measured gives 1.55pp buffer |
| statements | 41 | 44 | same |
| functions | 31 | 32 | ratcheted; 33.56% gives 1.56pp buffer |
| branches | 56 | 56 | unchanged; 57.30% still clears |

A4 returned lines/statements to ≥ 44 (above the pre-A3 value of 42), fulfilling the Rule 4 exception documented in A3.

---

## Deliverables Checklist

- [x] 5 priority zero-coverage files covered (GovernanceDrawers, LandingPage, adminTourSteps, analyticsExport, DemoAdminLoader)
- [x] Batch B — 10 small components covered (6 × SortIcon, AvgDonut, SaveBar, ChartDataTable, StepperBar)
- [x] PeriodCells — ProgressCell, StatusPill, LifecycleBar covered
- [x] 35 new qa-catalog entries added (17 priority + 11 batch B + 7 PeriodCells)
- [x] 618/618 tests green, 0 failures
- [x] Zero-coverage count: 133 (≤ 134 target met; 16 files eliminated)
- [x] vite.config.js thresholds ratcheted (lines/stmts 44, funcs 32)
- [x] coverage-history.md row appended
- [x] This report

## Follow-up for A5

- Medium-surface targets: `PeriodsTable.jsx` (555), `ControlPanel.jsx` (458), `OutcomesTable.jsx` (266), `CriteriaManager.jsx` (222)
- Goal: −30 files, 133 → ≤ 103
- Branches threshold has minimal headroom — avoid adding large untested branch-heavy files without covering them
