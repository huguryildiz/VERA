# Global Score Display Pattern

## Problem

Score values (e.g. `90.9 /100`) render inconsistently across admin tables. Heatmap and Jurors use a plain `avg-score-value` span with no emphasis. Projects uses `vera-score-num` (accent + mono) but omits the `/100` denominator entirely. Overview KPI cards define their own one-off `kpi-value-denom` for `/100`. Result: three different looks for the same conceptual value, no global standard.

User wants one global pattern: **left of the slash = vera blue, monospace, bold; right of the slash = dimmer, smaller, gray.**

## Scope

Three pages — **Heatmap, Jurors, Projects** — plus consolidation of the existing `kpi-value-denom` usage in Overview so there is a single source of truth.

Out of scope: Rankings (already uses `vera-score-num`; can adopt `vera-score-denom` later), jury drawers, reviews, feedback screens.

## Design

### CSS (`src/styles/table-system.css`)

Keep the existing numerator class. Add a paired denominator class right beneath it.

```css
/* Numeric score value — existing */
.vera-score-num {
  font-family: var(--font-mono, ui-monospace, monospace);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--accent);
}

/* Denominator — new */
.vera-score-denom {
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 0.78em;
  font-weight: 400;
  color: var(--text-tertiary);
  letter-spacing: 0;
  margin-left: 1px;
}
```

Rationale:

- `0.78em` keeps the denom proportional to whatever parent font-size the host table/card uses — no fixed `px` values that break in KPI cards vs. table cells.
- `var(--text-tertiary)` is the standard dim-gray token already used by `kpi-value-denom`.
- `margin-left: 1px` instead of a literal space preserves baseline alignment across mono/proportional mixing.

### JSX usage

Canonical pattern:

```jsx
<span className="vera-score-num">{value}</span>
<span className="vera-score-denom">/100</span>
```

Call-site changes:

| File | Line | Change |
|---|---|---|
| `src/admin/features/jurors/components/JurorsTable.jsx` | 128 | Replace `avg-score-value` span with the two-span pattern |
| `src/admin/features/projects/components/ProjectsTable.jsx` | 251 | Keep `vera-score-num`, append `vera-score-denom` span |
| `src/admin/features/heatmap/HeatmapPage.jsx` | 487, 507, 520 | Replace each `avg-score-value` span with the two-span pattern |
| `src/admin/features/overview/OverviewPage.jsx` | 367 | Switch `kpi-value-denom` → `vera-score-denom` |
| `src/styles/components/cards.css` | 140 | Delete `kpi-value-denom` definition |

The span-level class `avg-score-value` is fully replaced by the two new spans. The cell-level class `avg-score-cell` on the `<td>` wrapper — which drives color-gradient thresholds (red/yellow/green) and row alignment — stays untouched.

### Empty state

Unchanged. When a score is missing, pages render `—` (em-dash) inside `avg-score-value` or `text-muted`; no denominator appended.

## Testing

- Visual pass: Heatmap, Jurors, Projects tables in light + dark mode.
- `npm test -- --run` — no test changes expected; existing table tests assert on values, not span structure.
- `npm run build` — verify no stale references to `kpi-value-denom`.

## Non-Goals

- No new React component. Two CSS classes only; call sites wrap manually.
- No migration of Rankings, drawers, reviews. Those stay as-is.
- No change to score color-gradient logic (red/yellow/green thresholds) that lives on `avg-score-cell`.
