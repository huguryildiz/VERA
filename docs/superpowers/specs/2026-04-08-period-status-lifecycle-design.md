# Period Status Lifecycle Design

**Date:** 2026-04-08
**Status:** Approved

## Problem

The current period status system derives 3 states (`active`, `completed`, `locked`) from two booleans (`is_current`, `is_locked`). The "Completed" state is ambiguous: a newly created period that has never been activated also appears as "Completed", which is misleading.

## Decision

Introduce a 4-state lifecycle with a new `activated_at` column to distinguish periods that have never been activated (Draft) from those that have finished (Completed).

## Lifecycle

```text
Draft → Active → Completed → Locked
```

| State | Meaning |
|-------|---------|
| **Draft** | Period created, setup in progress (criteria, projects, jurors) |
| **Active** | Live evaluation period, jurors can submit scores |
| **Completed** | Evaluation finished, scores editable, not yet finalized |
| **Locked** | Scores finalized, criteria immutable, read-only |

## DB Change

Single column addition to `periods` table:

```sql
ALTER TABLE periods ADD COLUMN activated_at TIMESTAMPTZ;
```

### Migration backfill

- `is_current = true` rows: `activated_at = now()`
- All other existing rows: `activated_at = created_at`
- New periods created after migration: `activated_at = NULL` (true Draft)

### Activation trigger

When a period is set as current (`is_current = true`) and `activated_at IS NULL`, set `activated_at = now()`. This happens once per period lifetime.

## Status Derivation

Priority order (first match wins):

```text
is_locked = true         → Locked
is_current = true        → Active
activated_at IS NOT NULL → Completed
activated_at IS NULL     → Draft
```

Implemented as a pure function `getPeriodStatus(period)` in `PeriodsPage.jsx` (replacing current 3-state version).

## Badge Design

| Status | Background | Text Color | Icon (Lucide) |
|--------|-----------|------------|---------------|
| **Draft** | `rgba(79,70,229,.08)` | `#4f46e5` | `FileEdit` |
| **Active** | `var(--success-soft)` | `#15803d` | `Play` or `CircleDot` |
| **Completed** | `rgba(217,119,6,.08)` | `#b45309` | `CheckCircle` |
| **Locked** | `rgba(100,116,139,.08)` | `#64748b` | `Lock` |

Dark mode: use existing `--fb-*` token pattern for contrast adjustments.

Light mode contrast: all text colors chosen for WCAG AA on white/light backgrounds.

## Locked Period Behavior (Soft Read-Only)

### Immutable when locked

- All scores
- Criteria weights, rubric bands, outcome mappings

### Editable when locked

- Period name and description
- Project metadata (title, advisor, team members)
- Export and report generation
- Unlock action (restores full editing via typed confirmation)

## Draft to Active Transition (Soft Warning)

When admin sets a period as Active, check and display warnings (non-blocking):

| Condition | Warning message |
|-----------|----------------|
| No projects | "Bu period'da henuz proje yok" |
| No criteria defined | "Degerlendirme kriterleri tanimlanmamis" |
| No entry token | "Juri giris token'i olusturulmamis" |

Admin can proceed with "Yine de devam et" action. Warnings do not block activation.

## KPI Strip Update

Update period KPI metrics to include all 4 states:

| Metric | Filter |
|--------|--------|
| Total | All periods |
| Draft | `activated_at IS NULL && !is_current && !is_locked` |
| Active | `is_current && !is_locked` |
| Completed | `activated_at IS NOT NULL && !is_current && !is_locked` |
| Locked | `is_locked` |

## Filter Dropdown Update

Status filter options become:

```text
All | Draft | Active | Completed | Locked
```

Replaces current 3-option filter. The separate "Eval Lock" filter can be removed since Locked is now a first-class status.

## CSS Classes

```css
.sem-status-draft     { background: rgba(79,70,229,.08); color: #4f46e5; }
.sem-status-active    { background: var(--success-soft);  color: #15803d; }
.sem-status-completed { background: rgba(217,119,6,.08);  color: #b45309; }
.sem-status-locked    { background: rgba(100,116,139,.08); color: #64748b; }
```

## Row Subtitle Text

| Status | Subtitle |
|--------|----------|
| Draft | "Kurulum asamasinda" |
| Active | "Degerlendirme devam ediyor" |
| Completed | "Tamamlandi - skorlar duzenlenebilir" |
| Locked | "Kilitli - skorlar kesinlesmis - salt okunur" |

## Files to Modify

| File | Change |
|------|--------|
| `sql/migrations/002_tables.sql` | Add `activated_at` column + backfill |
| `src/admin/pages/PeriodsPage.jsx` | Update `getPeriodStatus`, `StatusPill`, KPIs, filters, subtitles |
| `src/admin/hooks/useManagePeriods.js` | Update KPI counts, set `activated_at` on first activation |
| `src/shared/api/admin/periods.js` | Update `setCurrentPeriod` to set `activated_at` |
| `src/styles/pages/periods.css` | Add `.sem-status-draft`, update `.sem-status-completed` colors |

## Out of Scope

- Archived state (covered by existing `is_visible` flag)
- Date-based automatic status transitions
- Status history / audit trail for state changes
