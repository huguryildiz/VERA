# Phase 7 — Manage Pages (Jurors, Projects, Periods)

## Summary

Wrote three management pages from scratch using prototype HTML as source of truth. All pages follow the CriteriaPage hook initialization pattern and wire into existing hooks (`useManagePeriods`, `useManageProjects`, `useManageJurors`).

## Files Created

| File | Lines | Description |
| ---- | ----- | ----------- |
| `src/admin/pages/PeriodsPage.jsx` | ~350 | Evaluation Periods page — table, filter, export, add/edit modal, set-current modal |
| `src/admin/pages/ProjectsPage.jsx` | ~340 | Projects page — table, search, filter, export, add/edit modal, detail drawer |
| `src/admin/pages/JurorsPage.jsx` | ~530 | Jurors page — table, search, filter, export, detail drawer, add/edit/reset-PIN/PIN-reveal/remove modals |

## CSS Files (created in prior session)

| File | Description |
| ---- | ----------- |
| `src/styles/pages/periods.css` | `sem-*` classes — header, banner, table, status pills, action menus |
| `src/styles/pages/projects.css` | Project table row interaction, manage-student-row |
| `src/styles/pages/jurors.css` | Full juror page: header, toolbar, table, pagination, drawer, action menus, status pills, avatar, editing banner |

## Prototype Ranges

| Page | Lines | Parity |
| ---- | ----- | ------ |
| Jurors | 13492-14001 | Full — all KPI, table, drawer, 5 modals |
| Projects | 14001-14294 | Full — KPI, table, drawer, add/edit modal |
| Periods | 14294-14519 | Full — banner, KPI, table, set-current modal, add/edit modal |

## Hook Wiring

All three pages follow the same initialization pattern from CriteriaPage:

- `useToast` for success messages
- `loadingCount` / `incLoading` / `decLoading` counter pattern
- `setPanelError` / `clearPanelError` callback pattern
- `useManagePeriods` in all three (provides `viewPeriodId`, `viewPeriodLabel`, `periodList`)
- `useManageProjects` in Projects + Jurors pages
- `useManageJurors` in Jurors page only

## Terminology

- File renamed to `PeriodsPage.jsx`, export is `PeriodsPage`
- All visible UI text uses "Period(s)" / "Evaluation Period(s)" — never "Semester(s)"
- CSS prefix stays `sem-*` (matching periods.css)

## Key Decisions

- Props match AdminPanel exactly: `{ organizationId, selectedPeriodId, isDemoMode, onDirtyChange, onCurrentSemesterChange }`
- `onCurrentSemesterChange` maps to hook's `onCurrentPeriodChange`
- Filter panels use native `<select>` elements (lighter than prototype's custom dropdown for initial parity)
- Export panels are structural shells — download logic deferred to future phase
- Pagination is static (single-page display) — server-side pagination deferred

## What's Next

Phase 8 — Criteria + Outcomes pages (prototype lines 14519-14797).
