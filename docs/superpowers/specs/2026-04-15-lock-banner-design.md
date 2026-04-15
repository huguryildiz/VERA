# Lock Banner — Amber Glow Design

**Date:** 2026-04-15
**Scope:** Criteria page (new) + Outcomes page (upgrade existing `.lock-notice`)
**Trigger:** `is_locked = true` on the selected evaluation period

---

## Summary

When a period is locked (scores exist), both the Criteria and Outcomes admin pages show a premium animated banner at the top of the content area. The banner communicates which fields are read-only and which remain editable.

The design is **Option A — Amber Glow**: warm amber gradient background, sweeping shimmer, glowing bottom bar, and a pulsing ring around the lock icon.

---

## Visual Design

### Structure (shared)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  [left panel]  │  [body]                                                 │
│                │                                                         │
│  🔒 icon       │  Title: "Evaluation in progress — structural fields locked"│
│  LOCKED badge  │  Desc:  one-sentence explanation                        │
│                │  Chips: [locked chips…] [editable chip]                 │
│                │                                                         │
│━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ glowing bottom bar ━━━━━━━━━━━━━━━━━━━━│
└─────────────────────────────────────────────────────────────────────────┘
```

### Animations (3 concurrent)

| Name | Selector | Duration | Behavior |
|------|----------|----------|----------|
| Shimmer sweep | `.lock-notice::before` | 3.5s ease-in-out infinite | White gradient sweeps left→right, fades in/out at edges |
| Glow bar | `.lock-notice::after` | 2.8s ease-in-out infinite | 2px bottom border pulses opacity 0.5↔1.0 |
| Pulsing ring | `.lock-notice-icon-wrap::after` | 2.8s ease-out infinite | Border scales 0.92→1.12 and fades out |

### Light mode tokens

| Element | Value |
|---------|-------|
| Background | `linear-gradient(135deg, rgba(254,243,199,0.60), rgba(255,251,235,0.45), rgba(254,252,232,0.55))` |
| Border | `rgba(245,158,11,0.25)` |
| Box-shadow | `0 0 0 1px rgba(245,158,11,0.12), 0 4px 20px rgba(245,158,11,0.10), inset 0 1px 0 rgba(255,255,255,0.70)` |
| Icon stroke | `#b45309` |
| Badge/chip locked text | `#92400e` |
| Shimmer layer | `rgba(255,255,255,0.35–0.55)` |
| Bottom glow bar | `rgba(251,191,36,0.80)` peak |

### Dark mode tokens

| Element | Value |
|---------|-------|
| Background | `linear-gradient(135deg, rgba(251,191,36,0.07), rgba(30,24,10,0.50), rgba(251,191,36,0.05))` |
| Border | `rgba(251,191,36,0.20)` |
| Icon stroke | `#fcd34d` |
| Badge/chip locked text | `#fcd34d` |
| Shimmer layer | `rgba(255,255,255,0.04–0.07)` |
| Bottom glow bar | `rgba(252,211,77,0.65)` peak |
| Chip editable text | `#4ade80` |

---

## Per-Page Content

### Criteria Page

**Title:** `Evaluation in progress — structural fields locked`

**Description:** `Criteria weights, rubric bands, and outcome mappings cannot be changed while scores exist. Labels and descriptions remain editable.`

**Chips:**
- `<Lock>` Criterion Weights — locked
- `<Lock>` Rubric Bands — locked
- `<Lock>` Outcome Mappings — locked
- `<PencilLine>` Labels & Descriptions — editable

### Outcomes Page

**Title:** `Evaluation in progress — structural fields locked`

**Description:** `Criterion mappings and coverage types cannot be changed while scores exist. Outcome labels and descriptions remain editable.`

**Chips:**
- `<Lock>` Criterion Mappings — locked
- `<Lock>` Coverage Types — locked
- `<PencilLine>` Labels & Descriptions — editable

---

## CSS Changes

**File:** `src/styles/components.css`

The existing `.lock-notice` block (lines ~4386–4557) is **replaced in-place** with the Amber Glow design. No new CSS class is introduced — the shared class name is preserved so OutcomesPage picks up the upgrade automatically.

Changes from current design:
- `::before` pseudo-element added → shimmer sweep animation
- `::after` pseudo-element changed from `height: 1px` bottom border to `height: 2px` animated glow bar
- `.lock-notice-icon-wrap` gains `box-shadow` with amber glow
- `.lock-notice-icon-wrap::after` ring animation timings tightened (scale range 0.92→1.12, was 0.94→1.08)
- Background gradient enriched (3-stop instead of flat)
- Dark mode overrides updated to match new tokens

## JSX Changes

**File:** `src/admin/pages/CriteriaPage.jsx`

Add lock banner block immediately after the `{panelError && <FbAlert>}` check, before the weight budget bar. Condition: `isLocked && periods.viewPeriodId`. Icons used: `Lock` (already imported), `LockKeyhole` (already imported), `PencilLine` (already imported).

**File:** `src/admin/pages/OutcomesPage.jsx`

No JSX changes needed — the banner markup already exists and uses `.lock-notice`.

---

## Constraints

- No new files created — all changes in existing files
- No new CSS classes — reuse `.lock-notice` and its sub-classes
- Animations use `infinite` loops; no JS required
- `prefers-reduced-motion` is not in scope for this iteration
- Banner is not dismissible — it is permanent while the period is locked
