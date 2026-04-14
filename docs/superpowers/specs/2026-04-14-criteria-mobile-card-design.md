---
title: Criteria Page — Mobile Card Redesign
date: 2026-04-14
status: approved
---

# Criteria Page — Mobile Card Redesign

## Overview

Replace the current inline-expand `CriterionEditor` pattern on the admin Criteria page with a **read/preview card** on mobile, opening a drawer for all editing actions. This removes the complexity of nested inline editors on small screens and delivers a premium SaaS feel consistent with the rest of the admin panel.

Scope: `src/admin/pages/CriteriaPage.jsx`, `src/admin/criteria/CriterionEditor.jsx`, `src/styles/pages/criteria.css`.
Desktop behavior is unchanged.

---

## Card Anatomy (Mobile, ≤ 768px)

Each criterion is rendered as a self-contained preview card. No expand/collapse behavior. Tapping "⋯" opens a `FloatingMenu`; tapping "Edit" opens `EditSingleCriterionDrawer`.

### Header row
- **Color dot** (criterion accent color, 10×10 px circle)
- **Criterion name** (semibold, truncated to 1 line)
- **Pts badge** (`30 pts` — dark pill, right-aligned)
- **"⋯" button** — opens `FloatingMenu`

### Rubric bands (horizontal rows)
One row per band. Band name on the left, score range on the right.

```
Excellent            25–30 pts
Good                 19–24 pts
Fair                 13–18 pts
Insufficient          0–12 pts
```

Band names use existing color tokens (`crt-band-excellent`, `crt-band-good`, `crt-band-fair`, `crt-band-poor`). Score range is rendered via the existing `bandRangeText(band)` helper in `CriteriaPage.jsx`. Each row has a faint separator.

### Outcome pills
MDK/ABET/custom outcome codes rendered as small pills below the rubric bands (e.g., `MDK 9.1`, `MDK 9.2`). Maximum 4 pills visible; overflow shown as `+N` pill. No add/remove button in locked state.

### Empty state
When no criteria exist: single card with dashed border, clipboard icon (`lucide-react`), "No criteria yet" heading, short description, and "Add First Criterion" primary button. Uses `text-align: justify` for the description per global convention.

---

## Page-Level Elements

### Period selector
Existing `CustomSelect` at top of page. Unchanged.

### Weight budget bar (`WeightBudgetBar`)
Shows total allocated points out of 100.
- Default state: indigo fill, e.g. `60 / 100 pts`.
- Locked state: amber fill, `100 / 100 pts`.
- If the component does not yet accept a color-variant prop, add one during implementation.

### Add Criterion button
Shown only in unlocked state. In locked state the button is hidden (replaced by amber lock badge in the page header).

### Lock info banner
When the selected period is locked (scores exist): amber `FbAlert` banner below the period selector reads: "This period is locked — criterion weights and rubric bands are read-only. Labels and descriptions remain editable." Uses `text-align: justify`.

---

## Locked State

When `period.is_locked === true`:

- Lock badge (amber, `Lock` lucide icon + "Locked" label) replaces Add button in page header.
- Lock banner shown as described above.
- Each card gets an amber left border (`border-left: 3px solid var(--warning)`).
- A compact lock strip inside the card (amber background, small `Lock` icon, "Weights & bands are read-only") appears at the card top.
- Rubric band rows are rendered in muted/gray text.
- Score ranges remain visible (read-only).
- "⋯" menu still available but Edit opens drawer in partially locked mode: labels/descriptions editable, weights/bands disabled.
- "+" outcome mapping button hidden.

---

## FloatingMenu Actions

The existing `FloatingMenu` component (already imported in `CriteriaPage.jsx`) is used. Actions:

| Action | Behavior |
|--------|----------|
| Edit Criterion | Opens `EditSingleCriterionDrawer` |
| Duplicate | Creates copy with same config, appended to list (implement if not already wired) |
| Move Up | Reorders criterion one position up |
| Move Down | Reorders criterion one position down |
| *(separator)* | — |
| Delete | Danger red; opens `ConfirmDialog` |

---

## Responsive Breakpoint

The new card layout activates at `≤ 768px`. Above this breakpoint, the existing `CriterionEditor` inline-expand pattern is unchanged.

Implementation approach: CSS `@media (max-width: 768px)` block within `criteria.css` hides the desktop inline editor and shows the mobile card. The mobile card markup can live inside `CriterionEditor.jsx` behind a `isMobile` prop or a CSS visibility strategy — implementation detail left to the plan.

---

## CSS Conventions

All new rules go in `src/styles/pages/criteria.css`. Use existing token variables (`--warning`, `--danger`, `--text-muted`, etc.). No inline styles. No nested panel backgrounds (per "no inner panels" rule — use `border-top` separators for band rows). Text in any description or banner: `text-align: justify; text-justify: inter-word`.

---

## Components Touched

| File | Change |
|------|--------|
| `src/admin/pages/CriteriaPage.jsx` | Pass locked state + period info to criterion cards; wire `FloatingMenu` to card's `onEdit`/`onDuplicate`/`onMoveUp`/`onMoveDown`/`onDelete` |
| `src/admin/criteria/CriterionEditor.jsx` | Add mobile card markup (conditional on breakpoint or `isMobile` prop); keep desktop inline-expand intact |
| `src/styles/pages/criteria.css` | Add `.crt-mobile-card`, `.crt-mobile-band-row`, `.crt-mobile-outcome-pill`, lock strip, empty state, responsive breakpoint rules |
| `src/admin/drawers/EditSingleCriterionDrawer.jsx` | Optionally: respect `lockedFields` prop to disable weight/band inputs when period is locked |

No new files needed.

---

## Out of Scope

- Desktop layout changes
- EditSingleCriterionDrawer internals (already built)
- Pagination component changes
- Outcome mapping drawer
