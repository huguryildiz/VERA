# Evaluation Periods — Premium Redesign Spec

**Date:** 2026-04-14
**Mockup:** `docs/mockups/periods-premium-mockup.html`
**Scope:** Visual redesign of `src/admin/pages/PeriodsPage.jsx` and `src/styles/pages/periods.css`

---

## Summary

Upgrade the Evaluation Periods page from a flat table to premium card-wrapped table with lifecycle bar, enriched columns, and compact mobile cards — matching the design quality of CriteriaPage and OutcomesPage.

---

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Table vs cards | Card-wrapped table (desktop), stacked cards (mobile) | Consistent with CriteriaPage pattern; table on mobile already existed |
| KPI strip | Keep + add lifecycle progress bar | Stacked bar shows Draft→Active→Completed→Locked distribution visually |
| Active row | Expanded with sub-text only ("Evaluation in progress") | Mini-stats removed — all info lives in dedicated columns now |
| Locked/Completed rows | No sub-text | Status pill already conveys state; avoids redundancy |
| Draft rows | Sub-text "Setup in progress" | Useful context for incomplete periods |
| Filter/Export | Keep inline panels, visual polish only | Single dropdown doesn't justify a drawer |
| Empty states | No changes — existing `vera-es-*` and `sw-empty-*` patterns stay | Out of scope for this redesign |

---

## New Table Columns

Current: Period | Status | Last Updated | Actions

New: **Period | Status | Date Range | Progress | Projects | Jurors | Criteria | Criteria Set | Framework | Updated | Actions**

### Column Details

| Column | Width | Content | Sort |
|--------|-------|---------|------|
| Period | min 160px | Name + badge-current (if active) + sub-text (active/draft only) | Yes (name) |
| Status | 90px | StatusPill component (draft/active/completed/locked) | Yes |
| Date Range | 130px | `start_date → end_date` format, `—` if null | Yes |
| Progress | 64px | Mini progress bar + percentage text. Active: computed from scores. Draft: `—`. Locked/Completed: `100%` | Yes |
| Projects | 56px | Count from period data, mono font. Zero shown muted | Yes |
| Jurors | 50px | Count from period data, mono font | Yes |
| Criteria | 54px | Count from period criteria config | Yes |
| Criteria Set | 110px | Criteria template/set name. Purple pill badge. Muted variant for older sets | No |
| Framework | 90px | Framework name in gradient pill badge with Layers icon. `—` if none | No |
| Updated | 80px | Relative time with full datetime in PremiumTooltip | Yes (default desc) |
| Actions | 36px | MoreVertical FloatingMenu (existing) | No |

---

## Lifecycle Progress Bar

New component between KPI strip and table card.

- **Label:** "Period Lifecycle" (left), summary text like "1 active · 3 locked · 1 draft" (right)
- **Bar:** 8px tall stacked horizontal bar with segments:
  - Draft: indigo gradient (`#818cf8 → #6366f1`)
  - Active: green gradient (`#34d399 → #10b981`)
  - Completed: amber gradient (`#fbbf24 → #d97706`)
  - Locked: slate gradient (`#94a3b8 → #64748b`)
- **Legend:** Dot + label + count for each status, inline flex row
- **Width calculation:** Each segment width = `(count / total) * 100%`

---

## Table Card Wrapper

Matching `crt-table-card` pattern from CriteriaPage:

- `border-radius: 12px`, `border: 1px solid var(--border)`, `background: var(--bg-card)`, `box-shadow: var(--shadow-sm)`
- **Header:** Card title "All Evaluation Periods" (left) + summary badge "N periods · M active" (right)
- **Table scroll:** Inner `div` with `overflow-x: auto` and `min-width: 900px` on table for narrow viewports

---

## Progress Column

Compact inline design (not ring):

- **Container:** Flex column, centered, 48px max-width bar
- **Bar:** 5px tall, border-radius 99px, `var(--success)` fill
- **Value:** 11px mono font above bar
- **States:**
  - Active period: computed percentage (e.g., `62%`), green fill
  - Draft: `—` muted text, empty bar
  - Locked/Completed: `100%` green text, full bar

---

## Mobile Card Layout (portrait ≤768px)

Each table row becomes a vertical card. Order:

1. **Period name** + Current badge (top, with actions button absolute top-right)
2. **Status pill**
3. **Date Range** (with micro-label)
4. **Progress** (bar + percentage, with micro-label)
5. **Stats strip** — inline flex: `N projects · M jurors · K criteria`
6. **Criteria Set** badge (with micro-label)
7. **Framework** badge (with micro-label)
8. **Updated** (bottom, separated by border-top)

Desktop-only columns (Projects, Jurors, Criteria as separate cells) are replaced by the combined stats strip on mobile.

---

## Visual Polish

- Replace raw `<Icon iconNode={[]}>` SVG usage with proper lucide-react components (`Filter`, `Download`, `Plus`)
- KPI strip: add icon accent colors matching status (indigo for draft, green for active, amber for completed, slate for locked)
- Status pills: existing styles preserved, no changes needed
- Active row: existing green left-border + gradient background preserved
- Draft row: existing indigo left-border preserved
- Locked rows: muted period name color (`var(--text-secondary)`), no sub-text
- Dark mode: all new elements must respect existing dark-mode CSS variable system

---

## Data Requirements

New columns need data not currently fetched by `useManagePeriods`:

| Data | Source | Notes |
|------|--------|-------|
| `start_date`, `end_date` | `semesters` table columns | Already exist in schema |
| Project count | Aggregate from `projects` table | `COUNT(*) WHERE semester_id = ?` |
| Juror count | Aggregate from `jurors` table or `jury_assignments` | `COUNT(DISTINCT juror_id)` |
| Criteria count | Already available via `listPeriodCriteria` or period criteria config | May need lightweight count RPC |
| Criteria set name | New concept — may be derived from criteria template name or period config | If not in schema, show first criterion label or `—` |
| Framework name | `frameworks` table via `framework_id` on period | Already available in `useAdminContext().frameworks` |
| Progress % | Computed: `(scored_sheets / total_expected_sheets) * 100` | Needs RPC or derived from score data |

**Implementation note:** For columns where data isn't readily available, show `—` placeholder initially. Data fetching can be added incrementally without blocking the UI redesign.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/admin/pages/PeriodsPage.jsx` | New columns, lifecycle bar, table card wrapper, progress column, mobile stats strip, replace raw Icon SVGs |
| `src/styles/pages/periods.css` | New styles: lifecycle bar, table card, progress bar, criteria set badge, framework badge, mobile card layout rewrite |

---

## Out of Scope

- Empty state redesign (already implemented)
- Filter/Export drawer migration (stays inline)
- New RPC creation for aggregate counts (placeholder `—` acceptable for v1)
- AddEditPeriodDrawer changes
- Dark mode CSS additions beyond variable inheritance (existing system handles it)
