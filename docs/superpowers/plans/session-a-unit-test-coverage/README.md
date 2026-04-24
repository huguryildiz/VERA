# Session A — Unit Test Coverage Expansion

**Goal:** Raise unit test coverage from the current **40.47% lines / 31.05% functions** baseline to a **calibrated "healthy SaaS" target of 65% lines / 50% functions / 62% branches**, and ratchet the vitest CI threshold along with it.

**Parallel with:** Session B — E2E Test Expansion (see `../session-b-e2e-test-coverage/`)

---

## Calibration note (2026-04-24, post-A2)

Original plan targeted 80/60 lines/functions. A1+A2 delivered only ~+3pp lines against a ~+14pp combined target. Root cause: the codebase is 73,874 src lines across 389 files; small hooks (96–634 lines) don't materially move a v8 percentage regardless of how thoroughly they're tested. Hitting 80% lines from A2's 43.42% would require ~27,000 newly-covered lines over 4 sprints = ~9× measured velocity, most of it chasing render/JSX branches that E2E already covers.

**Recalibrated** to 65% lines / 50% functions / 62% branches — genuinely healthy, achievable at ~5× A1+A2 velocity by targeting large surface areas (pages, drawer bundles, landing). Deep branch chasing on UI components is explicitly out of scope; Session B (E2E) owns those paths.

---

## Baseline and target

| Metric | Pre-A1 Baseline | Post-A2 Current | Calibrated Target | Remaining Delta |
|---|---|---|---|---|
| Lines | 40.47% | 43.42% | 65% | +21.6 pts |
| Branches | 55.62% | 57.21% | 62% | +4.8 pts |
| Functions | 31.05% | 33.19% | 50% | +16.8 pts |
| Statements | 40.47% | 43.42% | 65% | +21.6 pts |
| Test files | 147 | 160 | ~260 | +100 |
| Tests | 463 | 535 | ~900 | +365 |

**Source/test ratio:** 389 src files vs 160 test files (1 test per 2.4 src files → target 1:1.5).

---

## Biggest 0-coverage gaps (priority targets)

From the coverage report:

| File | Lines | Current | Priority |
|---|---|---|---|
| `src/shared/lib/adminSession.js` | 105 | 0% | Sprint 1 |
| `src/shared/theme/ThemeProvider.jsx` | 43 | 0% | Sprint 1 |
| `src/shared/schemas/criteriaSchema.js` | 32 | 0% | Sprint 1 |
| `src/shared/ui/AdminLoader.jsx` | 240 | 0% | Sprint 5 |
| `src/admin/adminTourSteps.js` | 103 | 0% | Sprint 3 |
| `src/shared/ui/Icons.jsx` | — | 3.73% func | Sprint 5 |
| `src/shared/ui/HighlightTour.jsx` | — | 47.89% | Sprint 5 |
| `src/shared/ui/Tooltip.jsx` | — | 34.40% | Sprint 5 |

---

## Sprint plan

A1 and A2 are complete. A3–A6 are recalibrated against the target above.

| Sprint | Status | Scope | Delta | Cumul. line cov |
|---|---|---|---|---|
| A1 | ✅ done | `shared/lib/*` + `shared/schemas/*` + `shared/theme/*` zero-coverage cleanup | +~1pp (regression fixes + thresholds) | ~41% |
| A2 | ✅ done | Admin orchestration hooks (`useAdminData`, `useAdminRealtime`, `useAdminNav`, `useGlobalTableSort`, `useDeleteConfirm`, `useBackups`, `useAdminTeam`, `usePeriodOutcomes`) | +1.85pp | 43.42% |
| A3 | pending | **Admin page expansion**: push big pages from 1–3 smoke tests to 5–8 tests each covering filter / row-action / empty / error branches. Targets: `JurorsPage`, `ProjectsPage`, `PeriodsPage`, `RankingsPage`, `HeatmapPage`, `ReviewsPage`, `OutcomesPage`, `AuditLogPage`, `AnalyticsPage`, `OverviewPage` | +5pp | ~48% |
| A4 | pending | **Jury flow + large zero-cov UI**: `AdminLoader.jsx` (240, 0%), `HighlightTour.jsx`, `Tooltip.jsx` + `useJuryState` sub-hooks, `writeGroup` dedup, expired/lock/offline paths | +5pp | ~53% |
| A5 | pending | **Drawer bundles + landing**: `GovernanceDrawers.jsx` (1308), `LandingPage.jsx` (1183) — render smoke + tab switching + key CTAs; `SetupWizardPage` branch coverage | +6pp | ~59% |
| A6 | pending | **API wrapper edges + gap fill + final ratchet**: `src/shared/api/admin/*` low-coverage modules, `adminTourSteps.js`, `Icons.jsx` (3.7% func), any <60% files not yet touched → thresholds to **65/50/62/65** | +6pp | ~65% |

---

## Rules (coordination with Session B)

1. **No component signature or DOM changes.** Session A only adds tests. If a component needs refactoring for testability, flag it — don't change shape.
2. **`data-testid` attributes are Session B's territory.** If a new testid helps a unit test, document it in the sprint report and notify Session B before commit.
3. **Shared fixtures:** `src/test/qa-catalog.json` must stay in sync across sessions. Register every new `qaTest()` id here first.
4. **CI threshold ratchet:** Every sprint ends with a bump in `vite.config.js` coverage.thresholds. Never lower a threshold. Do not over-ratchet — leave a small buffer (~1–2pp) below measured values for jitter.
5. **Per-sprint report:** Drop a file in `implementation_reports/A<N>-<slug>.md` summarising files touched, tests added, coverage delta.
6. **Depth discipline for UI tests:** On page/drawer/landing tests, cover render + happy path + one critical error/empty state. Do **not** exhaustively enumerate every internal branch — E2E owns that. Exhaustive branch coverage belongs on logic modules (helpers, selectors, pure functions, reducers).
7. **Per-folder function thresholds:** Global function threshold stays modest; add folder-scoped thresholds when raising overall numbers, e.g. `shared/lib` 70%, `shared/hooks` 50%, `shared/api` 55%, `admin/shared` 45%, `admin/features` 40%. This keeps thresholds honest against UI-heavy folders that inflate function counts with render/memo callbacks.

---

## Test conventions

- Use `qaTest()` instead of bare `it()`. Register the id in `src/test/qa-catalog.json` first.
- Mock `supabaseClient`: `vi.mock("../../lib/supabaseClient", () => ({ supabase: {} }))`.
- Test locations: `src/admin/__tests__/`, `src/jury/__tests__/`, `src/shared/__tests__/` (or feature-adjacent `__tests__/`).
- Never use native `<select>`; run `npm run check:no-native-select` after UI-adjacent work.

---

## Commands

```bash
npm test -- --run                    # fast feedback loop
npm test -- --run --coverage         # full coverage report (html at coverage/)
npm test -- --run --coverage src/shared/lib  # scoped coverage for a sprint
```

---

## Tracking

- Sprint reports: `implementation_reports/`
- Coverage history: append each sprint's `npm run coverage` summary to `coverage-history.md` (create on first use)
- Threshold history: tracked via git log on `vite.config.js`
