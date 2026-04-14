# Criteria Page Header Redesign

**Date:** 2026-04-14
**Status:** Approved

## Goal

Align the Criteria page's card header with the design language used on the Outcomes & Mapping page. Replace the single green summary badge with a structured chip row using the same token values as `fw-active-badge` and `fw-chip`. Achieve visual consistency within the same product design system without cross-page coupling.

---

## Layout

The `crt-table-card-header` uses a two-column flex layout (title left, chip row right), matching the Outcomes card header pattern.

```
[ Active Criteria ]   [ 4 criteria ] [ 100 pts · balanced ] [ Summer 2026 ] [ + Add Criterion ]
```

The period name is removed from the card title and moved into an accent period badge on the right. The card title becomes the static string `"Active Criteria"`.

The **Add Criterion** button moves from the page-level `crt-header` into the card header chip row. The `crt-header` section becomes title-only.

The **WeightBudgetBar** stays between the page header and the table card, unchanged.

---

## Chips

Three chips appear to the left of the Add button, all within `.crt-chips-row`.

### Criteria count chip

- Class: `.crt-chip.neutral`
- Icon: `ListChecks` (lucide-react, size 11)
- Text: `"N criteria"` / `"1 criterion"`
- Visibility: shown when `draftCriteria.length > 0`

### Weight status chip

- Class: `.crt-chip.success` when `draftTotal === 100`; `.crt-chip.warning` when `draftTotal !== 100 && draftCriteria.length > 0`
- Icon success: `CheckCircle2` (size 11)
- Icon warning: `AlertTriangle` (size 11)
- Text success: `"N pts · balanced"`
- Text warning: `"N / 100 pts"`
- Visibility: shown when `draftCriteria.length > 0`

### Period badge

- Class: `.crt-period-badge`
- Icon: `Calendar` (size 11)
- Text: `periods.viewPeriodLabel`
- Visibility: shown when `viewPeriodLabel` is non-empty

---

## CSS — New Classes in `criteria.css`

Replace `.crt-summary-badge` with the following:

```css
.crt-chips-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.crt-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 11px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;
  border: 1px solid;
  white-space: nowrap;
  line-height: 1.3;
}

.crt-chip svg {
  width: 11px;
  height: 11px;
  opacity: 0.7;
  flex-shrink: 0;
}

.crt-chip.neutral {
  background: var(--surface-1);
  border-color: var(--border);
  color: var(--text-secondary);
}

.crt-chip.success {
  background: rgba(22, 163, 74, 0.06);
  border-color: rgba(22, 163, 74, 0.15);
  color: var(--success);
}

.crt-chip.warning {
  background: rgba(217, 119, 6, 0.06);
  border-color: rgba(217, 119, 6, 0.15);
  color: var(--warning);
}

.crt-period-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 11px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  line-height: 1.3;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(139, 92, 246, 0.06));
  border: 1px solid rgba(59, 130, 246, 0.18);
  color: var(--accent);
}

.crt-period-badge svg {
  width: 11px;
  height: 11px;
  opacity: 0.7;
  flex-shrink: 0;
}
```

The `.crt-summary-badge` rule is deleted. `.crt-add-btn` is unchanged (it moves DOM position but keeps its existing styles).

---

## JSX Changes in `CriteriaPage.jsx`

### Card header

```jsx
<div className="crt-table-card-header">
  <div className="crt-table-card-title">Active Criteria</div>
  <div className="crt-chips-row">
    {draftCriteria.length > 0 && (
      <div className="crt-chip neutral">
        <ListChecks size={11} strokeWidth={2} />
        {draftCriteria.length} {draftCriteria.length === 1 ? "criterion" : "criteria"}
      </div>
    )}
    {draftCriteria.length > 0 && (
      periods.draftTotal === 100 ? (
        <div className="crt-chip success">
          <CheckCircle2 size={11} strokeWidth={2} />
          {periods.draftTotal} pts · balanced
        </div>
      ) : (
        <div className="crt-chip warning">
          <AlertTriangle size={11} strokeWidth={2} />
          {periods.draftTotal} / 100 pts
        </div>
      )
    )}
    {periods.viewPeriodLabel && (
      <div className="crt-period-badge">
        <Calendar size={11} strokeWidth={1.75} />
        {periods.viewPeriodLabel}
      </div>
    )}
    <button className="crt-add-btn" onClick={onAdd}>
      <Plus size={13} strokeWidth={2.5} />
      Add Criterion
    </button>
  </div>
</div>
```

### Page-level header

Remove the Add Criterion button from `crt-header`. The section becomes:

```jsx
<div className="crt-header">
  <h1 className="crt-page-title">Criteria</h1>
</div>
```

---

## What Is Not Changing

- Table rows, row actions, inline weight editing
- Drawer and modal behaviour
- WeightBudgetBar component and its CSS
- Page routing, API layer, data fetching
- `.crt-add-btn` styles

---

## Scope

This is a single-file JSX change (`CriteriaPage.jsx`) and a CSS-only update in `criteria.css`. No shared files touched. No API changes. No migration required.
