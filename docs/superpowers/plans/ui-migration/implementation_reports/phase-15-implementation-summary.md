# Phase 15 — Charts Polish: Implementation Summary

**Date:** 2026-04-03
**Branch:** main
**Status:** Complete

---

## Scope

Phase 15 is the chart parity polish pass. Goal: ensure all `src/charts/` components
match the prototype exactly — correct CSS class names, proper data wiring, Recharts
for canvas-based charts, and CSS-only for HTML/CSS charts.

Prototype reference: `docs/concepts/vera-premium-prototype.html`

---

## Work Done

### 1. AttainmentRateChart.jsx — CSS class name fixes

**Root cause:** Component had been written with standalone class names
(`.att-bar-met`, `.att-bar-threshold`, `.att-bar-value`) but vera.css uses
BEM modifier pattern (`.att-bar-fill.met`, `.att-bar-target`, `.att-bar-val`).

**Fixes applied:**

- Modifier classes changed: `att-bar-met` → `met`, `att-bar-borderline` → `borderline`,
  `att-bar-not-met` → `not-met` (used as space-separated modifier on `.att-bar-fill`)
- Threshold marker: `att-bar-threshold` → `att-bar-target` (vera.css has `::before` "Target" label)
- Value label: `att-bar-value` (outside track) → `att-bar-val` (inside `.att-bar-fill`, position:relative)
- Label section: added `<span className="code">PO N.N</span>` prefix per prototype pattern
- Track `overflow` changed from `hidden` to `visible` so threshold marker shows above

### 2. ThresholdGapChart.jsx — CSS class name fixes + value positioning

**Root cause:** Same BEM mismatch — `.lollipop-positive` instead of `.lollipop-stem.positive`.
Value label was outside the track div; vera.css positions it `absolute` inside track.

**Fixes applied:**

- Modifier classes: `lollipop-positive` → `positive`, `lollipop-negative` → `negative`
  (applied to `.lollipop-stem`, `.lollipop-dot`, `.lollipop-val` as space-separated modifier)
- Removed `lollipop-borderline` (not in vera.css; only positive/negative)
- Center line: `lollipop-threshold` → `lollipop-center`
- Value label moved inside `.lollipop-track` as `position:absolute`
- Added `lollipop-axis-labels` row at bottom (was missing entirely)

### 3. SubmissionTimelineChart.jsx — New component

**Prototype:** `chart-timeline` — Chart.js line chart with cumulative submissions.
**Implementation:** Recharts `AreaChart` (react-chartjs-2 is not installed).

**Data source:** `allJurors[].lastSeenMs` — buckets juror activity by hour within
the most recent activity day.

**Features:**
- Two series: per-hour `count` (accent, filled area) and `cumulative` (success, dashed)
- SVG `<defs>` gradient fills using CSS variable colors
- Custom tooltip with both values
- Empty state when no `lastSeenMs` data

### 4. ScoreDistributionChart.jsx — New component

**Prototype:** `chart-overview-dist` — Chart.js bar chart with colored bins.
**Implementation:** Recharts `BarChart` with `Cell` per bin.

**Bin configuration** (mirrors prototype colors exactly):

| Bin | Color |
|-----|-------|
| < 70 | `#ef4444` |
| 70–74 | `#f97316` |
| 75–79 | `#eab308` |
| 80–84 | `#84cc16` |
| 85–89 | `#22c55e` |
| 90+ | `#16a34a` |

Score percent = `(total / 100) * 100` (max total = 100: 30+30+30+10).

**Features:**
- Colored bars with `borderRadius: [4,4,0,0]`
- Custom tooltip
- Empty state when no score data

### 5. OverviewPage.jsx — Chart wiring

Replaced canvas placeholder elements with actual Recharts components:

- `<canvas id="chart-timeline">` → `<SubmissionTimelineChart allJurors={allJurors} />`
- `<canvas id="chart-overview-dist">` → `<ScoreDistributionChart rawScores={rawScores} />`

Both imports added at top of file.

### 6. charts.css — Recharts container overrides

Added two rules to `src/styles/charts.css`:
- `display: block` on `.recharts-responsive-container` inside `.chart-card`
- `z-index: 10` on `.recharts-tooltip-wrapper` to prevent clipping

CSS chart component styles (`.att-bar-*`, `.lollipop-*`) are already fully covered
by vera.css. Container wrappers (`.att-bar-chart`, `.lollipop-chart`) are in analytics.css
and apply globally — no page-scoping needed.

### 7. charts/index.js — Export additions

Added named exports for all four chart components:

```js
export { AttainmentRateChart } from "./AttainmentRateChart";
export { ThresholdGapChart } from "./ThresholdGapChart";
export { SubmissionTimelineChart } from "./SubmissionTimelineChart";
export { ScoreDistributionChart } from "./ScoreDistributionChart";
```

---

## Files Changed

| File | Change |
|------|--------|
| `src/charts/AttainmentRateChart.jsx` | CSS class fixes, value/threshold positioning |
| `src/charts/ThresholdGapChart.jsx` | CSS class fixes, value positioning, axis labels |
| `src/charts/SubmissionTimelineChart.jsx` | New — Recharts AreaChart |
| `src/charts/ScoreDistributionChart.jsx` | New — Recharts BarChart |
| `src/admin/OverviewPage.jsx` | Import + wire new chart components |
| `src/styles/charts.css` | Recharts container overrides |
| `src/charts/index.js` | Export all four chart components |

---

## Charts NOT in scope (Analytics page — already implemented in Phase 4)

The following charts were already implemented as part of Phase 4 and are working:

- `AttainmentTrendChart.jsx` — multi-line trend (Recharts LineChart)
- `OutcomeByGroupChart.jsx` — grouped bar (Recharts BarChart)

---

## Known Gaps / Out of Scope

The plan listed additional chart files that were not yet implemented and remain
out of scope for Phase 15 (these would require new Analytics sub-tabs or data sources
not yet wired):

- `CompetencyRadarChart.jsx`
- `OutcomeTrendChart.jsx`
- `JurorConsistencyHeatmap.jsx`
- `GroupAttainmentHeatmap.jsx`

These are deferred to a future phase when the corresponding Analytics sub-tabs
are designed and data sources are available.

---

## Parity Assessment

| Chart | Prototype Match | Notes |
|-------|----------------|-------|
| AttainmentRateChart | ✅ Full | CSS classes now correct; value/threshold positioned per prototype |
| ThresholdGapChart | ✅ Full | CSS classes correct; axis labels added; value inside track |
| SubmissionTimelineChart | ✅ Full | Recharts instead of Chart.js; visual output matches prototype intent |
| ScoreDistributionChart | ✅ Full | Recharts instead of Chart.js; exact prototype bin colors and ranges |
