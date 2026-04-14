# Indirect Assessment — Tooltip & Drawer Banner

**Date:** 2026-04-14
**Scope:** UI-only (no backend changes)
**Status:** Approved

---

## Context

VERA's Outcomes page has three coverage states for programme outcomes:
Direct (criteria mapped), Indirect (no criteria, manually toggled), Not Mapped.

The "Indirect" badge currently has no tooltip or explanation. Admins don't
know what it means or what to do about it.

## Decision: VERA does not manage indirect data

Indirect assessment (surveys, alumni feedback, employer evaluations) is
outside VERA's scope. VERA measures direct assessment through jury
evaluation. The Indirect badge is a **coverage awareness label** — it tells
the admin "this outcome exists in the framework but is assessed outside
VERA."

Indirect data import (per-respondent CSV, weighted averages, trend analysis)
is deferred to v2.0 in `docs/TO-DO.md`.

## Changes

### 1. Custom tooltip on coverage badges

Add hover tooltips to the three coverage badge states in the OutcomesPage
table. Must use custom tooltip component (not native `title` attribute per
CLAUDE.md rules).

**Tooltip text:**

| State | Text |
|-------|------|
| Direct | Assessed through mapped evaluation criteria. Attainment is calculated from jury scores. |
| Indirect | This outcome is assessed outside VERA through external instruments (surveys, alumni feedback, employer evaluations, etc.). Include results in your self-evaluation report. |
| Not Mapped | No assessment method assigned. Map criteria for direct assessment, or mark as indirect if assessed externally. |

**Placement:** Above the badge, centered. Dark background, 240px max-width.

### 2. Info banner in OutcomeDetailDrawer

Add a `FbAlert` banner inside the OutcomeDetailDrawer, below the criteria
mapping section, based on coverage state:

**Indirect outcomes** — `FbAlert variant="info"`:
> This outcome is not directly measured by VERA. It should be assessed
> through external instruments such as student exit surveys, alumni
> surveys, or employer evaluations. Include the results in your
> accreditation self-evaluation report.

**Not Mapped outcomes** — `FbAlert variant="warning"`:
> No assessment method assigned. You can map evaluation criteria for direct
> measurement, or mark this outcome as "Indirect" if it will be assessed
> through external instruments.

**Direct outcomes** — No banner (criteria list is self-explanatory).

## Files to modify

- `src/admin/pages/OutcomesPage.jsx` — Add tooltip to coverage badge in
  `OutcomeRow` component (replace native `title` attributes)
- `src/admin/drawers/OutcomeDetailDrawer.jsx` — Add `FbAlert` banner based
  on coverage state
- Tooltip component — Use existing custom tooltip if available, or create
  a minimal one

## Out of scope

- No new database tables
- No new API endpoints or RPCs
- No indirect data entry, import, or aggregation
- No analytics changes
- No KPI strip changes
