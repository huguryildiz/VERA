# Card Interaction Pattern — Design Spec

**Date:** 2026-04-11
**Status:** Approved

## Problem

Mobile card tap feedback is inconsistent across the app. Juror and organization list cards already have a polished blue-border/glow system on hover, active, menu-open, and focus-visible. Project and period cards are missing these states entirely. The pattern exists but is duplicated as ad-hoc per-page CSS — no shared token or selector group.

## Goal

Standardize the interactive card state language across all tappable list cards using CSS custom property tokens + a grouped selector block. No JSX changes required.

## Scope

### In scope (Phase 1 — this spec)

| Surface | Selector | Current state |
|---|---|---|
| Jurors mobile cards | `.jc` | Has states — refactor to tokens |
| Organizations mobile cards | `#page-organizations .organizations-table tbody tr` | Has states — refactor to tokens |
| Projects mobile cards | `#projects-main-table tbody tr` | Missing — add |
| Periods mobile cards | `.sem-table tbody tr` | Missing — add |

### Out of scope (Phase 1)

- **Drawer-active state**: When a card's edit drawer is open, keeping the border active requires React state tracking per page. Deferred to Phase 2.
- **Reviews table rows** (`.reviews-table tbody tr`): Read-only, `cursor: default`, no kebab menu. Not interactive — excluded.
- **Audit log rows** (`.audit-table tbody tr`): Informational list, hover background is sufficient. Excluded.
- **Modal, drawer, table header, form surfaces**: Never apply interaction states here.

## Approach

Hybrid: CSS custom property tokens + grouped selector block.

- Token values defined once in `src/styles/variables.css`
- All interactive card selectors grouped in a single block in `src/styles/components.css`
- No JSX changes required
- Changing the glow intensity or transition curve touches one place

## Token Design

Add to `:root` in `src/styles/variables.css`:

```css
/* ── Interactive card interaction tokens ── */
--card-i-shadow-base:   0 1px 3px rgba(0,0,0,.04), 0 0 0 0 rgba(59,130,246,0);
--card-i-shadow-hover:  0 0 0 3px rgba(59,130,246,.12), 0 4px 12px rgba(59,130,246,.06);
--card-i-shadow-active: 0 0 0 2px rgba(59,130,246,.22), 0 2px 6px rgba(59,130,246,.08);
--card-i-shadow-open:   0 0 0 3px rgba(59,130,246,.14), 0 4px 16px rgba(59,130,246,.08);
--card-i-shadow-focus:  0 0 0 3px rgba(59,130,246,.28);
--card-i-bg-active:     rgba(59,130,246,.03);
--card-i-transition:    border-color .15s, box-shadow .2s, background .1s, transform .1s;
```

Dark mode override (only `shadow-base` needs adjustment):

```css
.dark-mode {
  --card-i-shadow-base: 0 1px 4px rgba(0,0,0,.25), 0 0 0 0 rgba(59,130,246,0);
}
```

## State Matrix

| State | Trigger | Effect | Persistent? |
|---|---|---|---|
| `base` | Always | Pre-state shadow with transparent blue glow + transition | Yes |
| `:hover` | Pointer hover | `var(--accent)` border + `--card-i-shadow-hover` | While hovering |
| `:active` | Tap / click | `scale(0.985)` + `--card-i-shadow-active` + `--card-i-bg-active` tint | Flash only |
| `.menu-open` | Kebab menu open | Same glow as hover — card feels "selected" | Until menu closes |
| `:focus-visible` | Keyboard navigation | `outline: none` + `--card-i-shadow-focus` (stronger ring) | While focused |

## Layout-Shift Prevention

Border thickness never changes (always `1px solid`). Only `border-color` and `box-shadow` transition. The `transform: scale(0.985)` on `:active` is used instead of `border-width` change, so no layout shift occurs. The pre-state shadow (`--card-i-shadow-base`) includes a zero-alpha blue glow so the box-shadow transition animates smoothly without a jump.

## Implementation Plan

### Step 1 — Add tokens to `variables.css`

Add the 7 `--card-i-*` tokens to `:root` and the dark mode override to `.dark-mode`.

### Step 2 — Refactor existing states to use tokens

In `src/styles/pages/jurors.css` (`.jc` block) and `src/styles/components.css` (`#page-organizations` mobile block), replace the hardcoded `rgba(59,130,246,...)` values with the new token references.

### Step 3 — Grouped selector block in `components.css`

Add a clearly marked section `/* ── Interactive card states ── */` containing all 4 selectors with the 5 states each. This becomes the single canonical definition.

### Step 4 — Add `cursor: pointer` and `tabIndex` where missing

- `#projects-main-table tbody tr`: already has `cursor: pointer` in layout.css — confirm no tabIndex needed (handled by row click handler)
- `.sem-table tbody tr`: verify cursor state; add `cursor: pointer` if missing

### Step 5 — Manual test

- Mobile: tap each card type, verify blue flash + border on menu-open
- Desktop: hover each card type, verify glow
- Keyboard: Tab through cards, verify focus ring
- Dark mode: verify glow visible but not garish
- Overflow/layout shift: tap rapidly, verify no content jump

## Files to Change

| File | Change |
|---|---|
| `src/styles/variables.css` | Add `--card-i-*` tokens |
| `src/styles/pages/jurors.css` | Refactor `.jc` states to use tokens |
| `src/styles/components.css` | Refactor org card states + add grouped block for projects/periods |
| `src/styles/layout.css` | Add `cursor: pointer` to `.sem-table tbody tr` if missing |

## Manual Test Checklist

- [ ] Org card mobile: tap → blue flash → menu opens → border stays → menu closes → border gone
- [ ] Juror card mobile: same flow
- [ ] Project card mobile: tap → blue flash; menu-open → border stays
- [ ] Period card mobile: tap → blue flash; menu-open → border stays (if kebab present)
- [ ] Desktop hover on all four card types: glow visible
- [ ] Keyboard Tab through all four card types: focus ring visible, no outline artifact
- [ ] Dark mode: glow readable, not too bright
- [ ] No layout shift or double-border on any card type
- [ ] Reviews and audit rows: no blue border (excluded)
- [ ] Modal/drawer surfaces: no blue border bleed-through
