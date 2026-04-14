# Empty State Redesign — Design Spec

**Date:** 2026-04-14
**Status:** Approved

---

## Problem

Three admin pages — Evaluation Periods, Evaluation Criteria, and Programme Framework — each display a generic empty state when no data exists for the current period. The current implementation uses a basic centered icon + title + plain buttons pattern (`sw-empty-*` / `crt-empty-*` classes) with no visual hierarchy, no colour coding per context, and no guidance on which action is recommended versus manual.

---

## Solution

Replace all three empty states with a unified **"gradient hero + numbered steps"** pattern. Each card shares the same structural template but uses a unique colour accent that signals the page's role in the setup flow (green = required foundation, amber = required configuration, blue = optional accreditation).

---

## Design System

### Shared card structure

```
┌─────────────────────────────────────┐
│  [hero band — coloured gradient]    │
│  [icon box]  Title                  │
│              Description            │
├─────────────────────────────────────┤
│  [1]  Primary action        [Badge] │
│  ──────────── or ────────────       │
│  [2]  Secondary action     [Manual] │
├─────────────────────────────────────┤
│  ⓘ  Footer note                     │
└─────────────────────────────────────┘
```

### Colour coding per page

| Page | Accent | Meaning |
|---|---|---|
| Evaluation Periods | Green (`#16a34a`) | Required — setup foundation |
| Evaluation Criteria | Amber (`#d97706`) | Required — scoring configuration |
| Programme Framework | Blue (`#3b82f6`) | Optional — accreditation analytics |

### Hero band

- Coloured gradient background (light tint of accent colour)
- Subtle radial glow in top-right corner
- White icon box with coloured border and drop shadow
- Title: 14px, 700, `#0f172a`
- Description: 12px, 400, `#64748b`, `text-align: justify`

### Action rows

- Numbered badge (`1` / `2`) in accent colour
- Primary action: coloured tinted background + coloured border
- Secondary action: transparent background + neutral border
- Badge pill: accent-tinted for primary ("Recommended" / "Step 1" / "Fastest"), neutral grey for secondary ("Manual")
- Divider: `"or"` with hairline rules on either side

### Footer note

- `#fafbfd` background, top border
- Info icon + small helper text (10.5px, `#94a3b8`)
- Communicates: required vs. optional, and any constraint (e.g. "Weights must sum to 100 pts")

---

## Per-Page Spec

### Evaluation Periods (`PeriodsPage.jsx`)

**Trigger:** `pagedList.length === 0` and `statusFilter === "all"`

| Element | Content |
|---|---|
| Icon | `CalendarRange` (green) |
| Title | No evaluation periods yet |
| Description | An evaluation period defines the timeframe, criteria, and scope for jury evaluations. It is the foundation of your setup. |
| Action 1 | **Use Setup Wizard** · "Guided 7-step configuration from scratch" · Badge: **Step 1** |
| Action 2 | **Create manually** · "Set name, dates, and options yourself" · Badge: Manual |
| Footer | Required · Step 1 of 7 in minimum setup |

Action 1 calls `onNavigate?.("setup")`. Action 2 calls `openAddDrawer()` — same as current implementation.

---

### Evaluation Criteria (`CriteriaPage.jsx`)

**Trigger:** Period selected + `draftCriteria.length === 0`

| Element | Content |
|---|---|
| Icon | `ClipboardX` (amber) |
| Title | No criteria defined for this period |
| Description | Criteria are the scored dimensions jurors evaluate. Each criterion has a weight and optional rubric bands. |
| Action 1 | **Import from a previous period** · "Clone criteria and weights from an existing period" · Badge: **Fastest** |
| Action 2 | **Create from scratch** · "Add criteria one by one with custom weights" · Badge: Manual |
| Footer | Required · Weights must sum to 100 pts |

Action 1 opens the existing clone-period picker (already implemented inline). Action 2 triggers the existing "Add Criterion" drawer.

Note: The two existing sub-states ("No evaluation periods yet" and "No period selected") keep their current simpler treatment — the new design applies only to the "period selected but no criteria" state, which is the most actionable one.

---

### Programme Framework (`OutcomesPage.jsx`)

**Trigger:** `!frameworkId && !adminLoading`

| Element | Content |
|---|---|
| Icon | `Layers` (blue) |
| Title | No framework assigned to this period |
| Description | A framework defines programme outcomes and criterion mappings. Required for accreditation analytics and reporting. |
| Action 1 | **Start from an existing framework** · "Clone from a previous period or pick a platform template" · Badge: **Recommended** |
| Action 2 | **Create from scratch** · "Start blank and add your own outcomes" · Badge: Manual |
| Footer | Optional · Recommended for accreditation |

Both actions call `setFrameworkDrawerOpen(true)` — same as current implementation.

---

## CSS Approach

Add a new `empty-state` block to `src/styles/components.css` (or a new `src/styles/pages/empty-states.css` if preferred). Class prefix: `vera-es-*`.

Key classes:

```
.vera-es-card          — card shell (border-radius 16px, white bg, shadow)
.vera-es-hero          — hero band (flex row, overflow hidden)
.vera-es-hero--period  — green gradient variant
.vera-es-hero--criteria— amber gradient variant
.vera-es-hero--fw      — blue gradient variant
.vera-es-icon          — white icon box
.vera-es-icon--period  — green border/shadow
.vera-es-icon--criteria— amber border/shadow
.vera-es-icon--fw      — blue border/shadow
.vera-es-title         — 14px 700 #0f172a
.vera-es-desc          — 12px justified
.vera-es-actions       — action list wrapper
.vera-es-action        — action button (grid: num | text | badge)
.vera-es-action--primary-period   — green tinted
.vera-es-action--primary-criteria — amber tinted
.vera-es-action--primary-fw       — blue tinted
.vera-es-action--secondary        — neutral ghost
.vera-es-num           — numbered circle badge
.vera-es-badge         — pill badge
.vera-es-divider       — "or" rule
.vera-es-footer        — footer note strip
```

No dark mode override needed at this stage — existing `--bg-card`, `--text-*`, `--border` tokens already handle it. Accent tints use low-opacity `rgba` values that adapt naturally.

---

## Files Affected

| File | Change |
|---|---|
| `src/admin/pages/OutcomesPage.jsx` | Replace `sw-empty-*` empty state block with `vera-es-*` card |
| `src/admin/pages/CriteriaPage.jsx` | Replace `crt-empty-state` block (criteria-defined case only) with `vera-es-*` card |
| `src/admin/pages/PeriodsPage.jsx` | Replace `sw-empty-*` empty state block with `vera-es-*` card |
| `src/styles/components.css` | Add `vera-es-*` design system block |

---

## Out of Scope

- No DB migrations
- No API changes
- No changes to the two simpler Criteria sub-states ("No periods yet", "No period selected")
- No changes to drawer or modal logic — button `onClick` handlers stay identical
- Dark mode fine-tuning deferred; rgba tints work acceptably at launch
