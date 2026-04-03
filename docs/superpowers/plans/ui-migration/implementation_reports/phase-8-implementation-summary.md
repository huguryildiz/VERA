# Phase 8 — Criteria + Outcomes Pages

## Summary

Rewrote two configuration pages from scratch using prototype HTML as source of truth.
Both pages follow the CriteriaPage hook initialization pattern and wire into existing hooks
(`useManagePeriods`, `CriteriaManager`, `MudekManager`).

## Files Created / Rewritten

| File | Lines | Description |
| ---- | ----- | ----------- |
| `src/admin/pages/CriteriaPage.jsx` | ~270 | Criteria page — lock banner, header, table with rubric pills, row action menus, delete modal, CriteriaManager overlay |
| `src/admin/pages/OutcomesPage.jsx` | ~330 | Outcomes page — framework chip bar, KPI strip, warning banner, outcomes table with expand/collapse, MudekManager overlay |
| `src/styles/pages/criteria.css` | ~280 | All `crt-*` classes: info banner, header, add button, table card, band pills, editor overlay panel |
| `src/styles/pages/outcomes.css` | ~120 | Page-specific additions: expand button, outcome label, criteria chips, coverage badges, empty state |

## CSS Strategy

- `criteria.css` — all `crt-*` classes extracted from prototype (none existed in vera.css)
- `outcomes.css` — minimal page-specific additions only; `fw-*` and `acc-*` base classes already live in `vera.css`
- Editor overlay (`.crt-editor-overlay`, `.crt-editor-panel`) defined in `criteria.css`, shared by both pages

## Prototype Ranges

| Page | Lines | Parity |
| ---- | ----- | ------ |
| Criteria | 14519–14718 | Full — lock banner, table, rubric bands, row actions, delete modal |
| Outcomes | 14718–14797 | Full — framework chips, KPI strip, warning banner, outcomes table, coverage badges |

## Hook Wiring

Both pages follow the same initialization pattern:

- `useToast` for success messages
- `loadingCount` / `incLoading` / `decLoading` counter pattern
- `setPanelError` / `clearPanelError` callback pattern
- `useManagePeriods` — provides `viewPeriodId`, `viewPeriodLabel`, `periodList`, `updateCriteriaTemplate`, `updateMudekTemplate`, `loadPeriods`
- Props: `{ organizationId, selectedPeriodId, isDemoMode, onDirtyChange, onCurrentSemesterChange }`
- Hook call maps: `onCurrentPeriodChange: onCurrentSemesterChange`

## Key Decisions

### CriteriaPage

- Table view shows existing criteria from `criteria_config` (read-only display)
- "Add Criterion" and "Edit Criterion" both open `CriteriaManager` in a fullscreen drawer overlay
- "Remove Criterion" opens an inline delete modal; on confirm, filters the template array and calls `updateCriteriaTemplate` directly (no need to go through CriteriaManager)
- Rubric band class mapping by label name: excel→excellent, good→good, fair/satisf/average→fair, else→poor
- Weight % = `(criterion.max / totalMax) * 100` — computed at render time, not stored
- `CriteriaManager.onSave` closes the overlay on success

### OutcomesPage

- Framework chip bar shows a single MÜDEK chip (active) — multi-framework is a future feature
- Coverage computed inline: `direct` if any `criteria_config[*].mudek[]` contains the outcome code; `none` otherwise
- `indirect` count hardcoded to 0 (feature not yet implemented)
- Warning banner shown when `unmapped + indirect > 0`
- Rows have expand/collapse for showing `desc_tr` alongside `desc_en`
- "Add Outcome" and "Edit Outcome" both open `MudekManager` fullscreen overlay
- "Remove Outcome" opens an inline delete modal

## Prop Fix

Both old pages used `selectedSemesterId` (old prop name); both rewrites use `selectedPeriodId`
to match what `AdminPanel.jsx` actually passes (verified in `src/AdminPanel.jsx` line 317+).

## What's Next

Phase 9 — Entry Control page (prototype lines 14797+).
