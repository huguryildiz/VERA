# Periods Page — Criteria Set & Framework Navigation Redesign

**Date:** 2026-04-15
**Status:** Approved

## Problem

Criteria and outcome mapping settings are currently scattered across two places: the period drawer (framework picker, criteria copy, navigation links) and dedicated pages (CriteriaPage, OutcomesPage). This creates ambiguity — admins are unsure which surface is authoritative.

## Goal

Establish a clear rule: **criteria configuration and outcome mapping happen exclusively on their dedicated pages.** The Periods page becomes a hub that shows status and provides direct navigation; the period drawer handles only period metadata.

---

## Design

### 1. PeriodsPage — Table Cell Redesign (Option A)

Both the "Criteria Set" and "Framework" columns get a two-element layout: a status badge on the left and a small action icon button on the right.

**Criteria Set column — when data exists:**

```
[ ✓ 5 criteria ]  [ → ]
```

- Badge: `periods-cset-badge` (existing class, accent color) — clicking the badge also navigates (replaces the current PeriodCriteriaDrawer open behavior)
- Arrow button: `periods-cset-nav-btn` — clicking calls `onCurrentSemesterChange(period.id)` then `onNavigate("criteria")`

**Criteria Set column — when empty (no criteria configured):**

```
[ Not set ]  [ + ]
```

- Badge: `periods-cset-badge muted`
- Plus button: same `periods-cset-nav-btn` — same navigation target

**Framework column — when data exists:**

```
[ ✓ MÜDEK ]  [ → ]
```

- Badge: `periods-fw-badge clickable` (existing class) — clicking the badge also navigates (existing behavior already does this via `onNavigate("outcomes")`, arrow button makes it explicit)
- Arrow button: `periods-fw-nav-btn` — calls `onCurrentSemesterChange(period.id)` then `onNavigate("outcomes")`

**Framework column — when empty:**

```
[ Not set ]  [ + ]
```

- Badge: `periods-fw-badge none`
- Plus button: same navigation target (OutcomesPage)

**Navigation sequence (both columns):**
1. `onCurrentSemesterChange(period.id)` — sets the context period so the target page loads pre-selected
2. `onNavigate("criteria")` or `onNavigate("outcomes")` — switches the admin panel page

The existing `PeriodCriteriaDrawer` (quick-view summary drawer opened from the badge click) is removed. The badge click now also navigates — no more separate drawer.

---

### 2. AddEditPeriodDrawer — Strip to Metadata Only

#### Sections removed from Add mode

- Entire **"Scoring Setup"** section:
  - "Copy Criteria From" `CustomSelect`
  - Framework template cards (`fw-template-cards`)
  - `FrameworkPickerModal` trigger button ("More…")
  - Framework picker state variables: `formFrameworkId`, `formFrameworkName`, `fwPickerOpen`
  - `formCopyCriteriaFrom` state and the criteria-copy logic in `handleSave`

#### Sections removed from Edit mode

- **"Framework"** section: template cards, picker, lock warning, `FrameworkPickerModal`
- **"Scoring Criteria"** section: criteria list, "Edit Criteria & Rubrics →" link

#### What remains in both modes

- **Period Details**: name, description, start date, end date
- **Evaluation Settings**: lock select, visibility select

#### Additions

**Add mode — info banner** (placed at the bottom of the drawer body, above the save button footer):

```
ℹ  After creating, use the Criteria Set and Framework columns in the
   table to configure scoring or copy criteria from another period.
```

Style: `FbAlert variant="info"` with `Info` lucide icon. Justified text per CLAUDE.md convention.

**Post-save discoverability:**

The toast system (`useToast`) only supports plain text — no clickable links. A second toast is not used. Discoverability is handled by two mechanisms that already exist after this change:

1. The info banner in the drawer (above) teaches the workflow before save.
2. After creation, the new period row appears in the table with `[Not set] [+]` in both Criteria Set and Framework cells — the empty-state CTA is immediately visible without any extra prompt.

---

### 3. FrameworkPickerModal — Becomes Unused

`FrameworkPickerModal` is currently only used in `AddEditPeriodDrawer.jsx` — confirmed by grep (OutcomesPage does not import it; only `outcomes.css` references its class names for styling). After this change it has no callers. Remove the import from `AddEditPeriodDrawer`. The modal file itself (`src/admin/modals/FrameworkPickerModal.jsx`) can be deleted.

---

### 4. CriteriaPage & OutcomesPage — No Changes

Both pages already read `selectedPeriodId` from `useAdminContext`. As long as `onCurrentSemesterChange` is called before navigation, they will load pre-selected to the correct period. No modifications needed.

---

## Files Affected

| File | Change |
|------|--------|
| `src/admin/pages/PeriodsPage.jsx` | Criteria Set + Framework cell redesign; remove `criteriaDrawerOpen` state; remove `PeriodCriteriaDrawer` usage |
| `src/admin/drawers/AddEditPeriodDrawer.jsx` | Remove Scoring Setup section (add mode); remove Framework + Scoring Criteria sections (edit mode); add info banner; remove `FrameworkPickerModal` import |
| `src/admin/drawers/PeriodCriteriaDrawer.jsx` | No longer used — remove import from PeriodsPage (drawer file itself can stay for now) |
| `src/styles/pages/periods.css` | Add styles for `periods-cset-nav-btn`, `periods-fw-nav-btn`; adjust cell layout |

---

## Out of Scope

- CriteriaPage and OutcomesPage UI — no changes
- Period drawer "Copy Criteria" feature as a standalone page feature — not planned
- Mobile layout of the new cells — follows existing responsive pattern of the table
