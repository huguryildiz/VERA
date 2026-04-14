# Framework Picker Drawer — Design Spec

**Date:** 2026-04-14
**Status:** Approved

---

## Problem

The Outcomes page currently has a passive `fw-context-bar` with a static "MÜDEK 2024 — Kopya" chip plus two separate buttons ("Clone as new…", "Change…"). Framework management is split across a chip, two inline buttons, and a `FrameworkPickerModal`. The mental model is fragmented — users can't see previous periods, discover platform templates, or understand what actions are available at a glance.

---

## Solution

Replace the static chip with a **clickable trigger button** that opens a **`FrameworkPickerDrawer`** — a single surface that consolidates all framework management: view active, manage it, clone from previous periods, or start from a platform template.

---

## UI Changes

### fw-context-bar trigger

The `fw-chip` becomes a `<button>` with:
- Layers icon + framework name + outcome count badge + chevron-down
- Same blue accent style as current chip, plus hover state and `cursor: pointer`
- `onClick={() => setFrameworkDrawerOpen(true)}`

The "Clone as new…" and "Change…" buttons are **removed** from the bar (their actions move into the drawer).

### Empty state (no framework assigned)

The existing empty state ("No framework assigned to this period") keeps its two buttons but both now open the same `FrameworkPickerDrawer` instead of the old modal:
- "Start from an existing framework" → `setFrameworkDrawerOpen(true)` (scrolls to Previous Periods / Templates sections)
- "Create from scratch" → `setFrameworkDrawerOpen(true)` (scrolls to Create blank form)

---

## FrameworkPickerDrawer — Structure

New file: `src/admin/drawers/FrameworkPickerDrawer.jsx`

Uses the existing `Drawer` component (`src/shared/ui/Drawer.jsx`) and `drawers.css` design system.

### Header
- Icon: `Layers` (blue, same as active framework card)
- Title: "Programme Framework"
- Subtitle: "Manage, clone, or switch accreditation frameworks"
- Close button (✕)

### Section 1 — Active Framework
Shown only when a framework is assigned to the current period.

Displays a highlighted card with:
- Framework name + "Active" badge
- Meta pills: outcome count, period name, direct/indirect/unmapped summary
- Three action buttons:
  - **Clone as new…** — opens an inline name input (or small inline form) inside the drawer, calls existing `cloneFramework()`, then `onFrameworksChange()`
  - **Rename** — inline edit of framework name
  - **Remove** (danger) — unassigns framework from period after confirm; shows warning that mappings will be cleared

### Section 2 — Previous Periods
Lists all org frameworks that are NOT the currently active one, ordered by recency (most recent period first).

Each row shows:
- Period name (derived from framework name or linked period)
- Framework name + outcome count
- **Clone & Use** button — calls `cloneFramework(fw.id, autoName, orgId)` then `assignFrameworkToPeriod(periodId, clonedId)`, same logic as existing `handleChangeConfirmed`; shows confirm dialog if current period already has mappings

### Section 3 — Platform Defaults (Starter Templates)
Lists global frameworks (`organization_id IS NULL`) from `listFrameworks`.

Each item shows:
- Emoji icon + name + description + outcome count
- **Clone & Use** button — same flow as previous periods

Includes a "Create blank" option at the bottom — opens a small inline form (name input) inside the drawer body, calls `createFramework()` then `assignFrameworkToPeriod()`.

### Footer
- "Close" ghost button
- Disclaimer text: "Changing framework clears current mappings"

---

## Data

All data already flows into `OutcomesPage` via `useFrameworkOutcomes`. The drawer receives:

```
props:
  open              — boolean
  onClose           — () => void
  frameworkId       — string | null    (current active)
  frameworkName     — string
  frameworks        — array            (all org + global frameworks)
  organizationId    — string
  selectedPeriodId  — string
  criteria          — array            (for outcome count display)
  onFrameworksChange — () => void      (triggers reload)
  hasMappings       — boolean          (used for change-confirm gate)
```

No new API calls or RPC changes needed — drawer uses the same functions already called inline in `OutcomesPage`:
- `cloneFramework(id, name, orgId)`
- `assignFrameworkToPeriod(periodId, frameworkId)`
- `createFramework(name, desc, orgId)`

---

## State Changes in OutcomesPage

- Add `frameworkDrawerOpen` boolean state
- Add `frameworkDrawerOpen` boolean state
- Remove all old framework management state: `cloneNameOpen`, `cloneNameValue`, `cloneNameSubmitting`, `changePickerOpen`, `changeConfirmOpen`, `pendingChangeFramework`, `createFwOpen`, `createFwName`, `createFwDesc` — all replaced by drawer-internal state
- Remove `FrameworkPickerModal` import and usage; remove old `Modal` usage for framework create

---

## Files Affected

| File | Change |
|------|--------|
| `src/admin/pages/OutcomesPage.jsx` | Replace chip + inline buttons with trigger button; add `frameworkDrawerOpen` state; remove old modal/clone state; render `<FrameworkPickerDrawer>` |
| `src/admin/drawers/FrameworkPickerDrawer.jsx` | **New file** — full drawer component |
| `src/admin/modals/FrameworkPickerModal.jsx` | **Delete** — superseded by drawer |
| `src/styles/pages/outcomes.css` | Minor: add trigger button hover style if not already covered |

---

## Out of Scope

- No DB migrations needed
- No new RPCs — existing API functions only
- No changes to `OutcomeDetailDrawer`, `AddOutcomeDrawer`, criteria pages, or analytics
