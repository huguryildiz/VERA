# Phase 4 Implementation Summary — Analytics Page (Charts + Full Page)

**Plan:** `docs/superpowers/plans/ui-migration/2026-04-ui-parity-repair.md`
**Date:** 2026-04-02
**Branch:** main

---

## Scope

Full Analytics page rewrite from prototype to React. All chart components created from scratch,
full CSS extracted from prototype, and the complete AnalyticsPage assembled and wired to admin hooks.

---

## Files Created

### Chart Components (`src/charts/`)

| File | Type | Description |
|---|---|---|
| `src/charts/index.js` | Module index | Re-exports `CHART_COPY` and `ChartDataTable` |
| `src/charts/chartCopy.js` | Constants | `CHART_COPY` — chart titles/notes for all 7 chart sections |
| `src/charts/chartUtils.jsx` | Utility | `ChartDataTable` — accessible `<details>` data table, auto-opens on `prefers-reduced-motion: reduce` |
| `src/charts/OutcomeByGroupChart.jsx` | recharts | Grouped bar chart — normalized score per criterion per project group, 70% reference line |
| `src/charts/RubricAchievementChart.jsx` | recharts | Stacked bar chart — rubric band distribution per criterion (Excellent/Good/Developing/Insufficient) |
| `src/charts/ProgrammeAveragesChart.jsx` | recharts | Bar chart — grand mean % ± 1σ per criterion with 70% reference line |
| `src/charts/AttainmentTrendChart.jsx` | recharts | Line chart — attainment rate trend across evaluation periods |
| `src/charts/AttainmentRateChart.jsx` | Pure HTML/CSS | Horizontal bar chart — % of evals meeting 70% threshold per criterion |
| `src/charts/ThresholdGapChart.jsx` | Pure HTML/CSS | Lollipop chart — deviation from 70% threshold per criterion |
| `src/charts/GroupAttainmentHeatmap.jsx` | HTML table | Criterion × group heatmap with color-coded attainment classes |
| `src/charts/JurorConsistencyHeatmap.jsx` | HTML table | CV (σ/μ × 100%) per criterion per group — inter-rater reliability |
| `src/charts/CoverageMatrix.jsx` | HTML table | 18 MÜDEK outcomes × VERA criteria coverage (direct/indirect/none) |

### Page Component

| File | Description |
|---|---|
| `src/admin/AnalyticsPage.jsx` | Full Analytics page — 8 sections, wired to `ScoresTab` props |

### Styling

| File | Description |
|---|---|
| `src/styles/pages/analytics.css` | Full CSS extracted from prototype — all section/chart/heatmap/badge styles |

### Updated Files

| File | Change |
|---|---|
| `src/admin/AnalyticsTab.jsx` | Re-export changed from deleted `./analytics/AnalyticsTab` to `./AnalyticsPage` |

---

## Architecture Decisions

### Chart Library

The plan referenced chart.js but the project only has recharts installed. All canvas-based
charts use recharts. CSS-only charts (AttainmentRateChart, ThresholdGapChart) are pure HTML/CSS
as designed in the prototype.

### Attainment Computation

"Attainment rate" is defined as **% of individual evaluation rows where `(score/max)*100 ≥ 70%`**
(not whether the cohort mean ≥ 70%). This is the correct interpretation for accreditation evidence.

### Attainment Cards

Cards show one entry per unique MÜDEK outcome code across all CRITERIA mudek mappings.
Multiple criteria can map to the same outcome code (e.g. technical maps to 1.2, 2, 3.1, 3.2) —
in that case the card's attainment is computed from the single primary criterion.

### CHART_COPY

Split into its own `chartCopy.js` module (not inline in `index.js`) so `analyticsDatasets.js`
can import `CHART_COPY from "../../charts"` via the index re-export.

### Coverage Matrix

The 18 MÜDEK outcomes are static (they don't change with data). Direct coverage is read from
`CRITERIA[].mudek[]`. Indirect coverage is hardcoded for outcomes 4, 5, 7.1 on the `technical`
criterion, and 7.1 on `teamwork` — matching prototype annotations.

---

## Page Sections

| # | ID | Section | Chart Component(s) |
|---|---|---|---|
| 01 | `#ans-attainment` | Outcome Attainment Status | Computed attainment cards + insight banner |
| 02 | `#ans-analysis` | Attainment Analysis | `AttainmentRateChart` + `ThresholdGapChart` |
| 03 | — | Outcome Achievement by Group | `OutcomeByGroupChart` |
| 04 | `#ans-overview` | Programme Overview | `RubricAchievementChart` + `ProgrammeAveragesChart` |
| 05 | `#ans-trends` | Continuous Improvement | `AttainmentTrendChart` |
| 06 | `#ans-reliability` | Group-Level Attainment | `GroupAttainmentHeatmap` |
| 07 | — | Juror Reliability | `JurorConsistencyHeatmap` |
| 08 | `#ans-coverage` | MÜDEK Outcome Coverage | `CoverageMatrix` |

---

## Props Contract (from ScoresTab)

```text
dashboardStats       — { id, name, count, avg }[] — project group summaries
submittedData        — score rows with projectId + criterion fields
overviewMetrics      — overview KPI object (not used directly in analytics)
lastRefresh          — Date (not rendered, available for future use)
loading              — boolean
error                — string | null
periodName           — string — current evaluation period name
semesterOptions      — { id, name }[] — available periods for trend selector
trendSemesterIds     — string[] — currently selected trend periods
onTrendSelectionChange — (ids: string[]) => void
trendData            — trend API response rows
trendLoading         — boolean
trendError           — string | null
criteriaConfig       — pass-through (not used, CRITERIA from config.js used directly)
outcomeConfig        — pass-through (not used)
```

---

## Test Results

```text
✓ src/admin/__tests__/smoke.test.jsx  (11 tests) — all pass
✓ src/admin/__tests__/RankingsTab.test.jsx  (7 tests) — all pass
```

Pre-existing failures (unrelated to Phase 4):

- `src/jury/__tests__/useJuryState.writeGroup.test.js` — step flow tests expect `pin` but get `qr_showcase`
- `src/admin/__tests__/OverviewTab.test.jsx`, `ScoreDetails.*.test.jsx`, `ScoreGrid.aria.test.jsx` — import
  deleted files from Phase A/B

---

## Post-Delivery Bug Fixes

### Fix 1 — Analytics page blank (AdminLayout not wired)

**Root cause:** `AdminLayout.jsx` had a placeholder comment
(`{/* Phase 4+: analytics, grid, details pages rendered here */}`) but never rendered
`AnalyticsPage` for the `scoresView === "analytics"` branch.

**Fix:** Added `import AnalyticsPage` and the missing render branch in
`src/admin/layout/AdminLayout.jsx`. Also destructured the trend-related values
(`trendData`, `trendLoading`, `trendError`, `trendPeriodIds`, `setTrendPeriodIds`,
`loadError`, `lastRefresh`) from `useAdminData` — they were already returned by the
hook but not consumed.

**Files changed:** `src/admin/layout/AdminLayout.jsx`

### Fix 2 — Nav items showed browser-default button styling

**Root cause:** `AnalyticsNav` renders `<button>` elements. The `.analytics-nav-item`
rule in `analytics.css` had no `background`, `border`, or `font-family` reset, so
browsers applied their default white-box button appearance.

**Fix:** Added `background:none; border:none; font-family:inherit` to
`.analytics-nav-item` in `src/styles/pages/analytics.css`.

**Files changed:** `src/styles/pages/analytics.css`

### Fix 3 — Recharts charts invisible (zero-height container)

**Root cause:** All four recharts components used `ResponsiveContainer height="100%"`,
which inherits height from the parent. The `.chart-body` wrapper has no explicit
`height` in CSS, so the container resolved to 0 px and rendered nothing.

**Fix:** Replaced `height="100%"` with explicit pixel values on each `ResponsiveContainer`.
Removed the now-unused `analytics-swipe-body` / `analytics-chart-scroll-surface` wrapper
divs from `AnalyticsPage.jsx` (those classes were never defined in CSS).

| Component | Height |
|---|---|
| `OutcomeByGroupChart` | 260 px |
| `RubricAchievementChart` | 240 px |
| `ProgrammeAveragesChart` | 240 px |
| `AttainmentTrendChart` | 240 px |

**Files changed:** `src/charts/OutcomeByGroupChart.jsx`, `src/charts/RubricAchievementChart.jsx`,
`src/charts/ProgrammeAveragesChart.jsx`, `src/charts/AttainmentTrendChart.jsx`,
`src/admin/AnalyticsPage.jsx`
