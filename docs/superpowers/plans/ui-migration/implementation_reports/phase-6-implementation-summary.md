# Phase 6 Implementation Summary — Reviews Page ✅

**Date:** 2026-04-02

**Plan:** `docs/superpowers/plans/ui-migration/2026-04-ui-parity-repair.md` — Phase 6

## Summary

Phase 6 canonical screen is **Reviews** (`src/admin/ReviewsPage.jsx`) with
prototype parity for `vera-premium-prototype.html` lines `13291-13490`.
`ScoreDetails` was replaced by `ReviewsPage`.

## ScoreDetails (replaced by ReviewsPage) -> Reviews Transition

### ✅ Removed legacy files

- `src/admin/ScoreDetails.jsx`
- `src/admin/components/details/ScoreDetailsHeader.jsx`
- `src/admin/components/details/ScoreDetailsFilters.jsx`
- `src/admin/components/details/ScoreDetailsTable.jsx`
- `src/admin/components/details/scoreDetailsColumns.jsx`
- `src/admin/components/details/scoreDetailsFilterConfigs.jsx`

### ✅ New canonical files

- `src/admin/ReviewsPage.jsx` — full Reviews page: header, filter banner, KPI strip,
  status legend, filter panel, export panel, reviews table, pagination, footer note.
- `src/styles/pages/reviews.css` — Reviews-specific layout/table/pagination styling.

### ✅ Wiring updates

- `src/admin/ScoresTab.jsx` — switched from `ScoreDetails` render path to
  `ReviewsPage` and removed the unused `semesterOptions` prop.
- `src/admin/layout/AdminLayout.jsx` — wired `scoresView === "details"` to
  render `ReviewsPage` (post-phase blank-page fix documented below).
- `src/admin/selectors/filterPipeline.js` — Reviews pipeline wiring kept as the
  canonical selector path (`buildProjectMetaMap`, `buildJurorEditMap`,
  `generateMissingRows`, `enrichRows`, `applyFilters`, `sortRows`,
  `computeActiveFilterCount`).

### ✅ State + behavior notes

- `useScoreDetailsFilters` stays as-is (legacy hook name, canonical usage by `ReviewsPage`).
- `multiSearchQuery` is applied before `applyFilters` and included in `activeFilterCount`.
- Criteria columns are dynamic via `buildScoreCols()`; `Total` stays appended.
- Export is CSV from sorted full rows (pre-pagination); `xlsx/pdf` remain UI stubs.

### Historical leftover (not canonical)

- `src/admin/components/details/scoreDetailsHelpers.js` still exists as an
  unused historical helper and contains a broken import from removed
  `ScoreDetailsTable`. It is not imported by `ReviewsPage`.

## Post-Phase Fixes

### Field name mismatch between `getScores` and `filterPipeline` (fixed 2026-04-02)

`getScores` was returning rows with different field names than what `filterPipeline` and `ReviewsPage` expected, causing juror avatars to show `?` and GRP/PROJECT/TEAM MEMBERS columns to show `—`.

| Old field (getScores) | New field (aligned) | Consumer expectation |
|---|---|---|
| `jurorName` | `juryName` | `filterPipeline`, `ReviewsPage` avatar |
| `jurorAffiliation` | `affiliation` | `filterPipeline`, `generateMissingRows` |
| `projectTitle` | `projectName` | `enrichRows` |
| `projectMembers` | `students` | `enrichRows`, `generateMissingRows` |
| `comment` | `comments` | `ReviewsPage` export, `applyFilters` |

`groupNo` was also added to the `getScores` shape (from `row.project?.group_no`).

`buildProjectMetaMap` was reading `p?.name` and `p?.students` but `getProjectSummary` returns
`p.title` and `p.members`. Fixed to `p?.title ?? p?.name` and `p?.members ?? p?.students`.

`AdminLayout`'s `matrixJurors` derivation was updated (`r.jurorName` → `r.juryName`,
`r.jurorAffiliation` → `r.affiliation`). The `adminApi.shaping.test.js` test was updated
to match the new field names.

**Files changed:** `src/shared/api/admin/scores.js`, `src/admin/selectors/filterPipeline.js`,
`src/admin/layout/AdminLayout.jsx`, `src/admin/__tests__/adminApi.shaping.test.js`

### Blank page fix: missing render branch in `AdminLayout` (fixed 2026-04-02)

`AdminLayout` had no `scoresView === "details"` branch, so `ReviewsPage` was never rendered —
the content area appeared blank. Added the branch with the correct props. Also added
`criteriaConfig = CRITERIA` default to `ReviewsPage` so it works without an explicit prop.

**Files changed:** `src/admin/layout/AdminLayout.jsx`, `src/admin/ReviewsPage.jsx`

## Parity (✅ Full)

The Reviews page now matches the prototype at full fidelity:

- Header + search + Filter/Export buttons
- Active-filter banner with count and "Clear filters" action
- KPI strip (Reviews / Jurors / Projects / Partial / Avg Score)
- Score + Juror status legend
- Collapsible filter panel (Juror / Project / Score Status / Juror Status)
- Collapsible export panel (CSV/Excel format selection + Download)
- Reviews table with dynamic criteria columns, juror avatars, status pills
- Pagination (first/prev/page numbers/next/last + page-size selector)
- Partial-row footer note
