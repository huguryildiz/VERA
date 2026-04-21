# Analytics Exports — Content Redesign

**Date:** 2026-04-21
**Scope:** Content only — structure, coverage, ordering, new/removed sections. No visual/typographic/localization/framework-aware changes.
**Pages affected:** `AnalyticsPage` exports only. Reviews/Rankings/Heatmap/ExportPage exports are **out of scope**.

---

## Problem

The Analytics page exports (XLSX, CSV, PDF) drifted from what the page actually displays:

- **XLSX contains sheets that do not appear on screen** (`Competency Profiles`, `Criterion Boxplot`).
- **XLSX is missing sections that do appear on screen** (Outcome Attainment Status cards, Threshold Gap, Group Attainment Heatmap).
- **PDF has chart-only sections with no underlying data table** (Threshold Gap Analysis, Group Attainment Heatmap).
- **No first-page summary** — the §01 attainment status cards that users see first on screen are absent from both exports.
- **CSV is a `# <sheet>` concatenation** of all XLSX sheets — not valid for any downstream tool; conceptually wrong for a multi-section report.

The page is the source of truth for the report. Exports must mirror it exactly.

## Design Principle

> **Analytics page = single source of truth. Exports mirror the page's sections, in the page's order, with the page's data. Nothing extra; nothing missing.**

Concretely:
- Every visible chart/card strip on screen appears as a section in both XLSX (one sheet) and PDF (one page, chart image + data table).
- Nothing that is not on screen appears in exports.
- Insight-banner narrative text is **not** exported — data only.
- Formats: **XLSX + PDF.** CSV is dropped from Analytics only (see rationale below).

---

## Final Section List (Canonical Order)

Order is the order on screen in `AnalyticsPage.jsx`:

| # | Section | XLSX sheet | PDF page | Notes |
|---|---|---|---|---|
| 01 | Outcome Attainment Status | `Attainment Status` *(new)* | chart image + table | Card strip captured as image via new `pdf-chart-attainment-status` id |
| 02a | Outcome Attainment Rate | `Attainment Rate` *(new, split from ProgrammeAverages)* | chart + table | |
| 02b | Threshold Gap Analysis | `Threshold Gap` *(new)* | chart + table *(table new)* | |
| 03 | Outcome Achievement by Group | `Outcome by Group` | chart + table | Existing |
| 04a | Rubric Achievement Distribution | `Rubric Achievement` | chart + table | Existing |
| 04b | Programme-Level Outcome Averages | `Programme Averages` | chart + table | Existing |
| 05 | Outcome Attainment Trend | `Trend` | chart + table | Conditional: ≥2 periods |
| 06a | Group Attainment Heatmap | `Group Heatmap` *(new)* | chart + table *(table new)* | |
| 06b | Inter-Rater Consistency Heatmap | `Juror Consistency` | chart + table | Existing |
| 07 | Coverage Matrix | `Coverage Matrix` | chart + table | Existing (currently named `Outcome Mapping` internally) |

**Removed from XLSX:** `Competency Profiles`, `Criterion Boxplot`. Their dataset builders (`buildCompetencyProfilesDataset`, `buildCriterionBoxplotDataset`) become unused and are deleted.

**Added:** Three new dataset builders in `src/admin/analytics/analyticsDatasets.js`:
- `buildAttainmentStatusDataset(submittedData, activeOutcomes, threshold, priorPeriodStats)` — rows: `code`, `label`, `attainment_rate_pct`, `status` (Met / Borderline / Not Met), `delta_pct` (vs prior period, optional).
- `buildThresholdGapDataset(submittedData, activeOutcomes, threshold)` — rows: `code`, `label`, `avg_pct`, `gap_pct` (`avg_pct − threshold`).
- `buildGroupHeatmapDataset(dashboardStats, activeOutcomes, threshold)` — rows: one per project group; columns: outcome codes; cell value = normalized score %; a trailing `below_threshold_count` column summarizes cells under threshold.

Dataset contracts follow the existing `{ sheet, title, headers, rows, extra?, note?, merges?, alignments? }` shape used by `addTableSheet`.

---

## Single Source of Truth in Code

To guarantee XLSX/PDF symmetry, introduce one canonical list in `src/admin/analytics/analyticsExport.js`:

```js
// Canonical section order. Drives both XLSX sheets and PDF pages.
// Keeps the two formats in lockstep — add a section here, it appears in both.
const ANALYTICS_SECTIONS = [
  { key: "attainment-status", title: "Outcome Attainment Status",          chartId: "pdf-chart-attainment-status",    note: (t) => `Per-outcome attainment rate with ${t}% threshold status`,                                       build: (p) => buildAttainmentStatusDataset(p) },
  { key: "attainment-rate",   title: "Outcome Attainment Rate",            chartId: "pdf-chart-attainment-rate",      note: (t) => `% of evaluations scoring ≥${t}% per programme outcome`,                                       build: (p) => buildAttainmentRateDataset(p) },
  { key: "threshold-gap",     title: "Threshold Gap Analysis",             chartId: "pdf-chart-threshold-gap",        note: (t) => `Deviation from ${t}% competency threshold per outcome`,                                        build: (p) => buildThresholdGapDataset(p) },
  { key: "outcome-by-group",  title: "Outcome Achievement by Group",       chartId: "pdf-chart-outcome-by-group",     note: (t) => `Normalized score (0–100%) per criterion per project group — ${t}% threshold reference`,      build: (p) => buildOutcomeByGroupDataset(p) },
  { key: "rubric",            title: "Rubric Achievement Distribution",    chartId: "pdf-chart-rubric",               note: ()  => `Performance band breakdown per criterion — continuous improvement evidence`,                  build: (p) => buildRubricAchievementDataset(p) },
  { key: "programme-averages",title: "Programme-Level Outcome Averages",   chartId: "pdf-chart-programme-averages",   note: (t) => `Grand mean (%) ± 1σ per criterion with ${t}% threshold reference`,                            build: (p) => buildProgrammeAveragesDataset(p) },
  { key: "trend",             title: "Outcome Attainment Trend",           chartId: "pdf-chart-trend",                note: ()  => `Attainment rate (solid) and average score % (dashed) per programme outcome across evaluation periods`, build: (p) => buildTrendDataset(p), conditional: (ds) => ds.rows.length >= 2 },
  { key: "group-heatmap",     title: "Group Attainment Heatmap",           chartId: "pdf-chart-group-heatmap",        note: (t) => `Normalized score (%) per outcome per project group — cells below ${t}% threshold are flagged`, build: (p) => buildGroupHeatmapDataset(p) },
  { key: "juror-cv",          title: "Inter-Rater Consistency Heatmap",    chartId: "pdf-chart-juror-cv",             note: ()  => `Coefficient of variation (CV = σ/μ × 100%) per project group — CV >25% indicates poor agreement`, build: (p) => buildJurorConsistencyDataset(p) },
  { key: "coverage",          title: "Coverage Matrix",                    chartId: "pdf-chart-coverage",             note: ()  => `Which programme outcomes are directly assessed by evaluation criteria`,                         build: (p) => buildOutcomeMappingDataset(p) },
];
```

- `buildAnalyticsWorkbook(params)` iterates `ANALYTICS_SECTIONS`, calls each `build(params)`, and appends a sheet — replacing the current `buildDatasets` helper plus hardcoded PDF `sections` array.
- `buildAnalyticsPDF(params, meta)` iterates the same list, captures the `chartId`, and renders chart + table.
- Sections whose dataset `rows.length === 0` (or whose `conditional` returns false) are skipped in both formats — consistent behavior.

This eliminates the current drift risk where XLSX and PDF lists evolved independently.

---

## UI Touchpoints

1. **`AnalyticsPage.jsx` §01 card strip** — add `id="pdf-chart-attainment-status"` to the `<div className="attainment-cards">` wrapper at approximately `src/admin/pages/AnalyticsPage.jsx:524` so `captureChartImage` can grab it.
2. **`ExportPanel` in `AnalyticsPage.jsx`** — remove the `csv` entry from `ANALYTICS_EXPORT_FORMATS` (lines 180–184). Panel then shows two options: XLSX, PDF.
3. **`handleExport` (line 336) and `generateFile` (line 412) in `AnalyticsPage.jsx`** — delete the `format === "csv"` branches. `buildExportFilename(..., "csv", ...)` call sites removed.

Send-by-email flow (`SendReportModal`) works unchanged — it calls `generateFile(format)` which now only returns XLSX or PDF blobs.

---

## What Stays the Same

- `buildExportFilename` — unchanged.
- `logExportInitiated` audit event — unchanged; `format` payload naturally narrows to `xlsx | pdf` for future analytics exports.
- PDF visual style: Inter font, logo, header meta line, footer page numbers, landscape A4, alternating row stripes.
- `captureChartImage` — unchanged; works generically on any DOM id.
- `addTableSheet` helper — unchanged.
- Existing dataset builders that survive (`buildOutcomeByGroupDataset`, `buildProgrammeAveragesDataset`, `buildTrendDataset`, `buildRubricAchievementDataset`, `buildJurorConsistencyDataset`, `buildOutcomeMappingDataset`) — unchanged.

## What Gets Removed

- XLSX sheets: `Competency Profiles`, `Criterion Boxplot`.
- Dataset builders: `buildCompetencyProfilesDataset`, `buildCriterionBoxplotDataset` (delete their imports and definitions in `analyticsDatasets.js` after confirming no other consumers — grep confirms they are used only by the export module).
- CSV code paths: `handleExport` CSV branch, `generateFile` CSV branch, `ANALYTICS_EXPORT_FORMATS.csv` entry.
- **CSV is removed from Analytics only.** Reviews, Rankings, Heatmap, ExportPage, ImportCsvModal, and CSV import flow are untouched.

## What Gets Added

- Dataset builders: `buildAttainmentStatusDataset`, `buildThresholdGapDataset`, `buildGroupHeatmapDataset`.
- `ANALYTICS_SECTIONS` canonical list in `analyticsExport.js`.
- `id="pdf-chart-attainment-status"` on the §01 card strip.
- In PDF: table rendering for Threshold Gap and Group Heatmap (was chart-only).
- In XLSX: sheets for Attainment Status, Threshold Gap, Group Heatmap.

---

## Section-by-Section Content Specs

### §01 Outcome Attainment Status

**Source on screen:** `attCards` array in `AnalyticsPage.jsx`; card fields are `code`, `label`, `attRate`, `statusClass`, `statusLabel`, `delta`.

**XLSX sheet `Attainment Status`:**

| Outcome | Description | Attainment Rate (%) | Status | Δ vs Prior Period (%) |
|---|---|---|---|---|
| PO-1 | Engineering knowledge | 82 | Met | +4 |
| PO-2 | Problem analysis | 68 | Borderline | −2 |
| … | | | | |

- `Δ vs Prior Period` column omitted entirely (not just blank) when no prior period data is available.
- `Status` values: `Met`, `Borderline`, `Not Met` — derived from `statusClass` already computed on screen.
- Trailing summary row: `X of Y outcomes met` as a single merged cell under the table (matches the on-screen insight-banner summary statistic, not the narrative text).

**PDF page:** Chart image = capture of the card strip. Data table = same as XLSX sheet.

### §02a Outcome Attainment Rate

Split from the current combined `Programme Averages` dataset into an outcome-level view that matches the chart on screen.

**Columns:** `Outcome`, `Description`, `Attainment Rate (%)`, `N (evaluations)`.

### §02b Threshold Gap Analysis

**Columns:** `Outcome`, `Description`, `Average Score (%)`, `Gap vs Threshold (%)` (negative = below threshold).

### §06a Group Attainment Heatmap

**Columns:** `Group` + one column per outcome code (cell = normalized score %) + trailing `Cells Below Threshold`.

Cells matching `< threshold` get a conditional-format style in XLSX (same style already used elsewhere — `headFont` red-background variant; reuse existing style helper if available, otherwise plain value is acceptable in v1).

### All other sections

Unchanged from current XLSX/PDF output. Only their relative order may shift to match screen order.

---

## Error Handling

- Dataset builders that receive empty/null inputs return `{ headers, rows: [] }`. Iteration code skips sections with zero rows — same rule in XLSX and PDF.
- `captureChartImage` failure for any single section logs to console and continues with the data table (existing behavior, preserved).
- All new builders are pure functions; no async, no I/O.

## Testing

Existing test scaffolding for exports lives in `src/admin/__tests__/export.test.js`. Add:

- Unit tests for each new dataset builder (`buildAttainmentStatusDataset`, `buildThresholdGapDataset`, `buildGroupHeatmapDataset`) with fixture inputs covering: happy path, empty input, all-below-threshold input, missing prior-period input (for attainment status).
- Integration test: `buildAnalyticsWorkbook` produces exactly the sheets listed in `ANALYTICS_SECTIONS` (no extras, no omissions) for a non-trivial fixture.
- Regression test: `buildAnalyticsWorkbook` with empty `submittedData` returns a workbook with zero sheets (all sections skip) — documents the "no data = no output" contract.

Run `npm test -- --run` and `npm run build` before closing.

## Migration / Rollout

No DB migration. No data-shape changes outside the export module. No changes to `shared/api` surface.

Existing audit-log entries with `format: "csv"` for `export.analytics` events remain valid historical records; no backfill.

The shared `ExportPanel` component (`src/admin/components/ExportPanel.jsx`) is NOT modified — Analytics uses its own inline panel. Changing the shared component would cascade into pages out of scope.

## Out of Scope (Explicit Non-Goals)

- PDF typography, branding, page layout beyond what this redesign requires.
- Localization (TR/EN), framework-name labeling (MÜDEK/ABET), methodology appendices.
- CSV in Reviews, Rankings, Heatmap, ExportPage — those formats stay.
- CSV import flow (`csvParser.js`, `ImportCsvModal`, etc.) — untouched.
- New executive-summary page with KPIs beyond what §01 already shows.
- Per-outcome detail pages, data-quality warnings, excluded-project lists.
- Insight-banner narrative text in exports — user-confirmed out.
