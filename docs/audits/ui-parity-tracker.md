# UI Parity Tracker

Tracks React rewrite progress against `vera-premium-prototype.html`.
Each row maps a screen to its prototype source range and the canonical React file.

Last updated: 2026-04-03 (Phase 11 complete)

## Admin Shell

| Screen | Prototype Range | Target React File | Status | Parity | Report |
| ------ | --------------- | ----------------- | ------ | ------ | ------ |
| CSS Extraction | 11–10531 (main block) | `src/styles/vera.css` | ✅ Done | Full | [Phase 0](../plans/ui-migration/implementation_reports/phase-0-implementation-summary.md) |
| Admin Shell (Sidebar + Header + Layout) | 11580–11710 | `src/admin/layout/AdminLayout.jsx` | ✅ Done | Full | [Phase 1](../plans/ui-migration/implementation_reports/phase-1-implementation-summary.md) |

## Scores Tab

| Screen | Prototype Range | Target React File | Status | Parity | Report |
| ------ | --------------- | ----------------- | ------ | ------ | ------ |
| Overview | 11758–11985 | `src/admin/OverviewPage.jsx` | ✅ Done | Full | [Phase 2](../plans/ui-migration/implementation_reports/phase-2-implementation-summary.md) |
| Rankings | 11985–12200 | `src/admin/RankingsPage.jsx` | ✅ Done | Full | [Phase 3](../plans/ui-migration/implementation_reports/phase-3-implementation-summary.md) |
| Analytics | 12200–13199 | `src/admin/AnalyticsPage.jsx` | ✅ Done | Full | [Phase 4](../plans/ui-migration/implementation_reports/phase-4-implementation-summary.md) |
| Heatmap | 13199–13288 | `src/admin/HeatmapPage.jsx` | ✅ Done | Full | [Phase 5](../plans/ui-migration/implementation_reports/phase-5-implementation-summary.md) |
| Reviews (Score Details) | 13291–13490 | `src/admin/ReviewsPage.jsx` | ✅ Done | Full | [Phase 6](../plans/ui-migration/implementation_reports/phase-6-implementation-summary.md) |

## Settings Tab — Manage Pages

| Screen | Prototype Range | Target React File | Status | Parity | Report |
| ------ | --------------- | ----------------- | ------ | ------ | ------ |
| Jurors | 13492–14001 | `src/admin/pages/JurorsPage.jsx` | ✅ Done | Full | [Phase 7](../plans/ui-migration/implementation_reports/phase-7-implementation-summary.md) |
| Projects | 14001–14294 | `src/admin/pages/ProjectsPage.jsx` | ✅ Done | Full | [Phase 7](../plans/ui-migration/implementation_reports/phase-7-implementation-summary.md) |
| Evaluation Periods | 14294–14519 | `src/admin/pages/PeriodsPage.jsx` | ✅ Done | Full | [Phase 7](../plans/ui-migration/implementation_reports/phase-7-implementation-summary.md) |
| Criteria | 14519–14718 | `src/admin/pages/CriteriaPage.jsx` | ✅ Done | Full | [Phase 8](../plans/ui-migration/implementation_reports/phase-8-implementation-summary.md) |
| Outcomes | 14718–14797 | `src/admin/pages/OutcomesPage.jsx` | ✅ Done | Full | [Phase 8](../plans/ui-migration/implementation_reports/phase-8-implementation-summary.md) |
| Entry Control | 14797–15050 | `src/admin/EntryControlPage.jsx` | ✅ Done | Full | [Phase 9](../plans/ui-migration/implementation_reports/phase-9-implementation-summary.md) |
| PIN Lock | 15050–15159 | `src/admin/PinBlockingPage.jsx` | ✅ Done | Full | [Phase 9](../plans/ui-migration/implementation_reports/phase-9-implementation-summary.md) |
| Audit Log | 15159–15621 | `src/admin/AuditLogPage.jsx` | ✅ Done | Full | [Phase 9](../plans/ui-migration/implementation_reports/phase-9-implementation-summary.md) |
| Export | 15621–15647 | `src/admin/ExportPage.jsx` | ✅ Done | Full | [Phase 9](../plans/ui-migration/implementation_reports/phase-9-implementation-summary.md) |
| Settings | 15647–16066 | `src/admin/SettingsPage.jsx` | ✅ Done | Full | [Phase 9](../plans/ui-migration/implementation_reports/phase-9-implementation-summary.md) |

## Other Areas

| Screen | Prototype Range | Target React File | Status | Parity | Notes |
| ------ | --------------- | ----------------- | ------ | ------ | ----- |
| Drawers + Modals | 22545–26700 | `src/admin/drawers/*.jsx`, `src/admin/modals/*.jsx`, `src/shared/ConfirmModal.jsx` | ✅ Done | Full | [Phase 10](../plans/ui-migration/implementation_reports/phase-10-implementation-summary.md) |
| Landing Page | 10541–11159 | `src/pages/LandingPage.jsx` | ✅ Done | Full | [Phase 11](../plans/ui-migration/implementation_reports/phase-11-implementation-summary.md) |
| Auth Pages | — | `src/auth/*.jsx` + `src/styles/auth.css` | 🔲 Pending | — | Phase 12 |
| Jury Flow | ~16351–16700 | `src/jury/steps/*.jsx` + `src/styles/jury.css` | 🔲 Pending | — | Phase 13 |
| App Shell + Routing | — | `src/App.jsx`, `src/AdminPanel.jsx`, `src/admin/ScoresTab.jsx` | 🔲 Pending | — | Phase 14 |
| Charts | — | `src/charts/*.jsx` + `src/styles/charts.css` | 🔲 Pending | — | Phase 15 |
| CSS Refactor | — | `src/styles/vera.css` → modular files | 🔲 Pending | — | Phase 16 |

## Legend

- ✅ Done — implemented and verified against prototype
- 🔲 Pending — not yet started
- ⚠️ Partial — implemented but known gaps remain
