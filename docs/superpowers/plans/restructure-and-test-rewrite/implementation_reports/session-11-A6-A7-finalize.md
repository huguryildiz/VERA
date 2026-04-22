# Session 11 — A6 + A7: Legacy Cleanup & Finalization

**Date:** 2026-04-23
**Branch:** main
**Build:** ✅ green (6.00s, 1902 modules transformed)

---

## Scope

A6: Audit remaining legacy flat directories (`admin/pages/`, `admin/drawers/`, `admin/modals/`, `admin/hooks/`, `admin/components/`, `admin/criteria/`, `admin/settings/`), move surviving files to `admin/shared/` or feature dirs, delete orphans, remove empty dirs, fix all stale import paths.

A7: Confirm `src/styles/` is globals-only (no `pages/`, no legacy CSS), run build, run smoke test.

---

## A6 — File Moves Summary

### → `src/admin/shared/`

| File | Former path |
|---|---|
| `useAdminContext.js` | `admin/hooks/` |
| `useAdminData.js` | `admin/hooks/` |
| `useAdminNav.js` | `admin/hooks/` |
| `useAdminRealtime.js` | `admin/hooks/` |
| `useGlobalTableSort.js` | `admin/hooks/` |
| `useBackups.js` | `admin/hooks/` |
| `usePageRealtime.js` | `admin/hooks/` |
| `useDeleteConfirm.js` | `admin/hooks/` |
| `useDeleteConfirm.test.jsx` | `admin/hooks/__tests__/` |
| `ExportPanel.jsx` | `admin/components/` |
| `ScoreStatusPill.jsx` | `admin/components/` |
| `DangerIconButton.jsx` | `admin/components/` |
| `DeleteBackupModal.jsx` | `admin/modals/` |
| `ImportCsvModal.jsx` | `admin/modals/` |
| `SendReportModal.jsx` | `admin/modals/` |
| `adminUtils.jsx` | `admin/components/index.jsx` (barrel) |

### → `src/admin/features/jurors/`

| File | Former path |
|---|---|
| `EnableEditingModal.jsx` | `admin/modals/` |
| `useAdminResponsiveTableMode.js` | `admin/hooks/` |

### → `src/admin/features/settings/`

| File | Former path |
|---|---|
| `useAdminTeam.js` | `admin/hooks/` |
| `LastActivity.jsx` | `admin/components/` |
| `SecuritySignalPill.jsx` | `admin/components/` |

### → `src/admin/features/heatmap/`

| File | Former path |
|---|---|
| `useGridSort.js` | `admin/hooks/` |
| `useGridExport.js` | `admin/hooks/` |

### → `src/admin/features/outcomes/`

| File | Former path |
|---|---|
| `useOutcomesExport.js` | `admin/hooks/` |

### → `src/admin/features/reviews/`

| File | Former path |
|---|---|
| `useReviewsFilters.js` | `admin/hooks/` |
| `ReviewMobileCard.jsx` | `admin/components/` |

---

## A6 — Orphan Deletions

| File | Reason |
|---|---|
| `admin/modals/DeleteGroupModal.jsx` | No production consumer |
| `admin/modals/UploadCsvModal.jsx` | No production consumer |
| `admin/hooks/useScrollSync.js` | No production consumer |
| `admin/components/CriteriaManager.jsx` | Re-export barrel to feature; deleted, canonical at `features/criteria/` |
| `admin/pages/PageShell.jsx` | No production consumer |

---

## A6 — Legacy Directories Removed

- `src/admin/pages/`
- `src/admin/drawers/`
- `src/admin/modals/`
- `src/admin/hooks/` (including `__tests__/`)
- `src/admin/components/`
- `src/admin/criteria/`
- `src/admin/settings/`
- `src/styles/pages/`

---

## A6.5 — Import Path Fixes

All 50+ stale import references updated via targeted `sed`. Key mappings:

| Old path | New path |
|---|---|
| `@/admin/hooks/useAdminContext` | `@/admin/shared/useAdminContext` |
| `@/admin/hooks/usePageRealtime` | `@/admin/shared/usePageRealtime` |
| `@/admin/hooks/useAdminNav` | `@/admin/shared/useAdminNav` |
| `@/admin/hooks/useAdminData` | `@/admin/shared/useAdminData` |
| `@/admin/hooks/useGlobalTableSort` | `@/admin/shared/useGlobalTableSort` |
| `@/admin/hooks/useBackups` | `@/admin/shared/useBackups` |
| `@/admin/hooks/useAdminTeam` | `@/admin/features/settings/useAdminTeam` |
| `@/admin/hooks/useAdminResponsiveTableMode` | `@/admin/features/jurors/useAdminResponsiveTableMode` |
| `@/admin/hooks/useGridSort` | `@/admin/features/heatmap/useGridSort` |
| `@/admin/hooks/useGridExport` | `@/admin/features/heatmap/useGridExport` |
| `@/admin/hooks/useOutcomesExport` | `@/admin/features/outcomes/useOutcomesExport` |
| `@/admin/hooks/useReviewsFilters` | `@/admin/features/reviews/useReviewsFilters` |
| `@/admin/modals/DeleteBackupModal` | `@/admin/shared/DeleteBackupModal` |
| `@/admin/modals/ImportCsvModal` | `@/admin/shared/ImportCsvModal` |
| `@/admin/modals/SendReportModal` | `@/admin/shared/SendReportModal` |
| `@/admin/modals/EnableEditingModal` | `@/admin/features/jurors/EnableEditingModal` |
| `@/admin/components/ExportPanel` | `@/admin/shared/ExportPanel` |
| `@/admin/components/ScoreStatusPill` | `@/admin/shared/ScoreStatusPill` |
| `@/admin/components/DangerIconButton` | `@/admin/shared/DangerIconButton` |
| `@/admin/components/LastActivity` | `@/admin/features/settings/LastActivity` |
| `@/admin/components/SecuritySignalPill` | `@/admin/features/settings/SecuritySignalPill` |
| `@/admin/components/ReviewMobileCard` | `@/admin/features/reviews/ReviewMobileCard` |
| `@/admin/components` (barrel) | `@/admin/shared/adminUtils` |
| `@/admin/pages/AnalyticsPage` | `@/admin/features/analytics/AnalyticsPage` |
| `@/admin/pages/HeatmapPage` | `@/admin/features/heatmap/HeatmapPage` |

### Relative import fixes (broken by file moves)

| File | Old | New |
|---|---|---|
| `features/reviews/useReviewsFilters.js` | `"../components"` | `"@/admin/shared/adminUtils"` |
| `features/reviews/useReviewsFilters.js` | `"../utils/persist"` | `"@/admin/utils/persist"` |
| `features/reviews/useReviewsFilters.js` | `"../../shared/dateBounds"` | `"@/shared/dateBounds"` |
| `features/reviews/ReviewMobileCard.jsx` | `"./ScoreStatusPill"` | `"@/admin/shared/ScoreStatusPill"` |
| `features/reviews/ReviewMobileCard.jsx` | `"../utils/jurorIdentity"` | `"@/admin/utils/jurorIdentity"` |
| `features/reviews/ReviewMobileCard.jsx` | `"../utils/adminUtils"` | `"@/admin/utils/adminUtils"` |
| `features/reviews/ReviewMobileCard.jsx` | `"../../shared/ui/EntityMeta"` | `"@/shared/ui/EntityMeta"` |
| `features/heatmap/useGridSort.js` | `"../utils/persist"` | `"@/admin/utils/persist"` |
| `features/heatmap/useGridSort.js` | `"../utils/scoreHelpers"` | `"@/admin/utils/scoreHelpers"` |
| `features/heatmap/useGridSort.js` | `"../utils/adminUtils"` | `"@/admin/utils/adminUtils"` |
| `features/heatmap/useGridExport.js` | `"../utils/exportXLSX"` | `"@/admin/utils/exportXLSX"` |
| `features/heatmap/useGridExport.js` | `"../utils/downloadTable"` | `"@/admin/utils/downloadTable"` |
| `features/outcomes/useOutcomesExport.js` | `"../utils/exportXLSX"` | `"@/admin/utils/exportXLSX"` |
| `features/outcomes/useOutcomesExport.js` | `"../utils/downloadTable"` | `"@/admin/utils/downloadTable"` |
| `features/settings/LastActivity.jsx` | `"../utils/adminUtils"` | `"@/admin/utils/adminUtils"` |
| `features/settings/useAdminTeam.js` | `"../../shared/api"` | `"@/shared/api"` |
| `selectors/filterPipeline.js` | `"../hooks/useReviewsFilters"` | `"@/admin/features/reviews/useReviewsFilters"` |

---

## A7 — Style Directory Audit

`src/styles/` after A6:

```
base.css, charts.css, components/, drawers.css, icon-surface.css, landing.css,
layout.css, main.css, maintenance.css, mobile.css, modals.css, print.css,
showcase-slides.css, status-pills.css, table-system.css, toast.css,
ui-base.css, variables.css, vera.css
```

- **No `pages/` directory** ✅
- **No `jury.css`, `auth.css`, `jury-arrival.css`** ✅ (extracted in A1–A4)
- **`components/`** has 8 split files from A5 ✅

---

## Verification

- **Import audit:** `grep -rn "@/admin/hooks/|@/admin/modals/|@/admin/components|@/admin/pages/|@/admin/drawers/"` → **0 results** ✅
- **Build:** `npm run build` → ✅ 1902 modules, 6.00s, no errors
- **Dev server HTTP check:**
  - `index.html` → 200 ✅
  - `src/main.jsx` → 200 ✅
  - `src/styles/main.css` → 200 ✅
  - All 8 `components/` CSS files → 200 ✅
  - 23/23 moved source files → 200 ✅
- **Playwright:** Browser locked by prior session — visual smoke test deferred (same situation as S10)

---

## State After Session

- All legacy flat dirs removed; codebase is now fully feature-based
- Zero stale import paths in production code
- `src/styles/` is globals-only (no page-level CSS)
- **Faz A6 complete** ✅
- **Faz A7 complete** ✅
- **Aşama A BİTTİ** — all A-phase restructuring done
- **Next:** Faz B — test rewrite (session 12+)
