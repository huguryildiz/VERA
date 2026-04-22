# Session 14 — Opus Sprint 3: Feature CSS Split

**Date:** 2026-04-23
**Model:** Opus 4.7 (1M context)
**Scope:** S14 — Split five admin feature CSS files into responsibility-based parts

---

## Summary

All five targeted admin feature CSS files were split into responsibility-based parts under each feature's `styles/` subdirectory with an `index.css` barrel. Total: **9,222 source lines → 23 parts**, every part ≤ 557 lines, well inside the CSS policy ceiling. Each feature committed atomically; `npm run build` ran green after every commit (no dev server started — other Opus sessions running in parallel).

This closes the last 5 Opus-targeted entries in the CSS modularization inventory. Remaining violations (heatmap 719, audit 645, AdminTeamCard 620, rankings 612) are all below 800 and deferred per plan.

---

## Parts produced

### `src/admin/features/reviews/styles/` (975 → 2 parts)

| File | Lines | Scope |
|---|---:|---|
| `page.css` | 593 | Desktop layout: page, table, pagination, header, summary, status guide, legend strips |
| `mobile.css` | 382 | Portrait card layout (`.rmc-*`) + portrait header responsive |
| **index.css** | 9 | Barrel |

### `src/admin/features/periods/styles/` (1334 → 4 parts)

| File | Lines | Scope |
|---|---:|---|
| `page.css` | 429 | Desktop page, lifecycle bar, table card wrapper, progress col, framework badge, criteria-set badge, date range, stat cols, banner, pills, row actions, landscape compact |
| `cards.css` | 330 | Mobile portrait cards (hero-ring layout, meta rows, config strip, footer) + touch pointer fixes |
| `inspector.css` | 260 | Criteria-set / framework cells, not-set row, readiness badge + inspector popover |
| `lifecycle.css` | 315 | Lifecycle Guide collapsible block (desktop + portrait responsive) |
| **index.css** | 12 | Barrel |

### `src/admin/features/outcomes/styles/` (2056 → 5 parts)

| File | Lines | Scope |
|---|---:|---|
| `page.css` | 543 | Core page, lock banner/badge, expand button, row states, detail row, coverage help popover, empty state, KPI cards, coverage progress bar, code badge |
| `editor.css` | 491 | Inline description, menu item desc, coverage type selector, legend strip, title group (editable title/subtitle), threshold pill, rename input, framework selector chip, unassign btn, framework pill rename, KPI filter drilldown |
| `framework-picker.css` | 488 | Framework Picker Drawer (`fpd-*`) + picker dropdown |
| `framework-cards.css` | 337 | Default template cards + quick-pick chips + shared template card + locked-state row + picker modal cards (`fpm-*`) |
| `responsive.css` | 197 | Mobile portrait (`.acc-legend-strip` etc.) + landscape compact + portrait page order |
| **index.css** | 15 | Barrel |

### `src/admin/features/setup-wizard/styles/` (2377 → 6 parts)

| File | Lines | Scope |
|---|---:|---|
| `base.css` | 401 | Stepper, wizard card shell, actions/footer, buttons, animations |
| `steps.css` | 378 | Steps preview, time estimate, template cards, framework picker (step 3), criteria preview |
| `forms.css` | 491 | Form fields, juror inline form, review cards layout, entry token section, premium token card (step 7) |
| `banners.css` | 361 | Setup progress banner, empty state, completion screen, warning banner, done banner, existing items list |
| `theme.css` | 348 | Dark mode overrides + redesign overrides (status chip, done summary, item rows, review/completion token) |
| `summary.css` | 398 | Premium summary card (`.sw-summary-card` / `.sw-srow*`) + mobile portrait responsive |
| **index.css** | 16 | Barrel |

### `src/admin/features/criteria/styles/` (2480 → 6 parts)

| File | Lines | Scope |
|---|---:|---|
| `page.css` | 517 | Page layout, header, add button, table card, title group (editable title), kebab, rename, chip row, period selector, clear-all, inline weight edit, mapping pills, coverage bar |
| `table.css` | 557 | Criteria table, cell elements, rubric band pills, row action buttons, empty state, collapsed band cards |
| `drawers.css` | 439 | Starter Criteria Drawer + Edit Criteria Drawer (tabs, weight budget bar, save bar, clone flow, footer responsive) + Single Criterion Drawer |
| `period-drawer.css` | 271 | PeriodCriteriaDrawer (`pcd-*`): active cards, card actions, template list, copy-from-period, inline confirm |
| `responsive.css` | 190 | Portrait page order, landscape compact, responsive breakpoints (1024 / 640 / 380) |
| `mobile-cards.css` | 504 | Mobile card layout + new mobile cards (header, section label, rubric band rows, outcome pills, lock badge, blurb) |
| **index.css** | 18 | Barrel |

---

## Policy compliance

| Range | Count | Status |
|---|---:|---|
| 200-400 (🟢 ideal) | 7 | — |
| 400-600 (🟢 acceptable) | 16 | — |
| 600-800 (🟡 attention) | 0 | — |
| 800+ (🔴 violation) | 0 | — |

**Every part is ≤ 557 lines.** The largest, `criteria/styles/table.css` (557), is a coherent single-responsibility file (the criteria table + cells + row actions + empty state) and sits well under the 600 target.

---

## Cross-page imports updated

Two sibling features imported setup-wizard's CSS directly:

- [PeriodsPage.jsx:76](../../../src/admin/features/periods/PeriodsPage.jsx#L76) — `@/admin/features/setup-wizard/SetupWizardPage.css` → `@/admin/features/setup-wizard/styles/index.css`
- [OutcomesPage.jsx:24](../../../src/admin/features/outcomes/OutcomesPage.jsx#L24) — same change

Handled in the setup-wizard commit.

---

## Build validation

After every commit: `npm run build` → ✓ green (no errors, ~5.7s). No dev server started (parallel Opus sessions for S12 styles/ and S13 jury/shared/auth/shared/ running concurrently on `main`).

---

## Git discipline

Five feature commits, atomic and scoped:

1. `refactor(admin/reviews): split ReviewsPage.css into responsibility files` — 8dea0b2
2. `refactor(admin/periods): split PeriodsPage.css into responsibility files` — 0890362
3. `refactor(admin/outcomes): split OutcomesPage.css into responsibility files` — f21969b
4. `refactor(admin/setup-wizard): split SetupWizardPage.css into responsibility files` — e92993c
5. `refactor(admin/criteria): split CriteriaPage.css into responsibility files` — 22f6c3b

**Scope leak note:** commit 0890362 (periods) unintentionally included files from S13 (jury/shared/styles/ parts + jury-base.css deletion). This was caused by a concurrent S13 Opus session touching those files and my using `git add -A <pathspec>` — subsequent commits used explicit file paths via `git add <file> …` to avoid recurrence. The jury/shared/styles content is still correct and useful; only the authoring attribution is muddled.

---

## Notes & decisions

- **File count vs user suggestion:** the original plan called for ~18 parts across the five features; the actual split landed at 23 because the two largest files (criteria 2480, setup-wizard 2377) each naturally decomposed into 6 subsystems rather than 4–5. Every part still lands under 600, which is the hard constraint.
- **Reviews / periods** boundaries are clean — one-page features with obvious mobile cutoffs.
- **Outcomes** has two effectively separate subsystems (core outcomes table + framework picker machinery). The `framework-picker.css` / `framework-cards.css` split keeps each under 500 without forcing combination of unrelated concerns.
- **Setup-wizard** has enough distinct sections (stepper, step content, forms, banners, theme overrides, summary redesign) that 6 files reflect the actual information architecture; combining would produce a single 600+ file for no gain.
- **Criteria** mixes desktop table + three drawers + two overlapping mobile layouts. The 6-way split puts each drawer in its own context and keeps the mobile-cards (504) separate from generic responsive breakpoints (190) — they serve different render paths.

---

## Follow-ups

- `src/admin/features/criteria/styles/table.css` (557) is close to 600; if new rubric visuals get added, consider pulling collapsed band cards (114 lines within) into a new `bands.css`.
- Deferred violations (heatmap 719, audit 645, AdminTeamCard 620, rankings 612) remain — all under 800, per plan not in scope for Opus sprints.
