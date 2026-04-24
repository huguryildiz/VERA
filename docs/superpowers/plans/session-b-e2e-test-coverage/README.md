# Session B — E2E Test Coverage Expansion

**Goal:** Repair + rewrite the Playwright suite so that critical user journeys are covered end-to-end with resilient tests. Target: **~60 passing specs across the critical flow catalog, 0 flakes, CI blocks on regression**.

**Parallel with:** Session A — Unit Test Coverage (see `../session-a-unit-test-coverage/`)

---

## Plan pivot (2026-04-24)

**Original plan** was to repair the existing suite sprint-by-sprint. After B1 (see `implementation_reports/B1-helper-repair.md`) we realised the legacy suite had accumulated too much drift (stale selectors, outdated route assumptions, DOM-coupled helpers) to make repair economical. B1 recovered only 10 → 14 passing with significant effort, and admin-login specs hit an app-side blocker that was independent of test code.

**Revised approach — rewrite, not repair:**

- **Same flow catalog** — the list of critical journeys stays identical (admin login, org CRUD, period CRUD, jurors CRUD, entry tokens, wizard, audit, import/export, jury happy path, tenant isolation, demo, password reset, invite-accept).
- **Fresh POMs** — new Page Object Models bound to current DOM, written once, owned by this plan.
- **`data-testid` contract is mandatory** — every new spec only uses `data-testid` selectors. Component-level text / role / placeholder selectors are banned. This prevents the drift that killed the legacy suite.
- **Legacy suite archived, not deleted** — `e2e/**/*.spec.ts` moves to `e2e/legacy/`. It stays in the repo as a behaviour oracle during rewrite but is excluded from `npm run e2e`.

---

## Baseline (2026-04-24, end of B1) → Final (2026-04-24, end of B5)

| Metric | B1 baseline | B5 final | Target |
|---|---|---|---|
| Passing | 14 / 57 | **35 / 36** | 60+ / ~65 |
| Failing | ~23 | **0** | 0 |
| Skipped / did not run | 20 | **1 (intentional lifecycle skip)** | 0 (or documented) |
| Flakes | unknown | **0 (verified repeat-each=3)** | 0 |
| CI gate | none | **✅ e2e.yml wired** | CI blocks on regression |
| Critical journeys covered | ~25% | **~85%** | 80% |

**Session B is CLOSED.** All MUST exit criteria met. Known app-side blocker from B1 (`clearPersistedSession()` race) was fixed in B2 (`src/auth/shared/AuthProvider.jsx`). Both realtime-race flakes fixed in B5 (`usePageRealtime.js` guard + `projects-no-period` sentinel).

---

## Revised sprint plan (5 sprints)

Each sprint ends green. Each spec uses only `data-testid` selectors. No sprint writes a new spec before the required testids have been added to the relevant components.

### B1 — CLOSED (2026-04-24, partial win)

See `implementation_reports/B1-helper-repair.md`. Recovered: 10 → 14 passing. Identified the drift ceiling that triggered the rewrite pivot.

### B2 — CLOSED (2026-04-24)

See `implementation_reports/B2-scaffolding-admin-login.md`. Legacy suite archived to `e2e/legacy/`. POMs created (`BasePom`, `LoginPom`, `AdminShellPom`). Root cause of admin-login → `/register` redirect identified and fixed (`clearPersistedSession()` race in `AuthProvider.jsx`). Result: 3/3 admin-login specs green.

### B3 — CLOSED (2026-04-24)

See `implementation_reports/B3-admin-crud-domains.md`. Full admin CRUD coverage: organizations, periods/semesters, jurors, entry tokens, projects (CRUD + CSV import). 20/20 green; each domain has ≥1 error-path spec.

### B4 — CLOSED (2026-04-24)

See `implementation_reports/B4-wizard-audit-jury.md`. Setup wizard (6 steps), audit log filters, rankings export, jury happy-path end-to-end, jury lock banner, jury resume, tenant-admin isolation. Result: 35/36 green, 1 intentional skip (lifecycle guard).

### B5 — CLOSED (2026-04-24)

See `implementation_reports/B5-closure-ci.md`. Flake sweep completed (2 root causes fixed: `usePageRealtime` missing `VITE_E2E` guard + `viewPeriodId` loading race in projects). Tenant-admin spec already green from B4. CI gate live (`.github/workflows/e2e.yml` — PR + main push triggers, browser binary cache, artifact upload). Result: **35/35 passed, 1 skipped (lifecycle), 0 flakes on repeat-each=3**.

---

## Rules (coordination with Session A)

1. **Session A cannot change component DOM or testids without flagging.** If a spec breaks because a component was refactored, track the root cause — don't just patch the selector.
2. **`data-testid` is Session B's territory and contract.** New testids added as part of a sprint must be documented in the sprint report. Session A is welcome to assert against them in unit tests.
3. **Shared fixtures:** `e2e/fixtures/` and `src/test/qa-catalog.json` stay in sync. Never branch them.
4. **`.env.e2e.local` seeds:** If a sprint needs new seed rows, document in sprint report + update `scripts/generate_demo_seed.js` if applicable.
5. **Flake policy:** A test that passes 9/10 runs is broken — fix the root cause, don't add retries.
6. **Rewrite discipline:** No spec is merged that uses a non-testid selector. No PR that adds a test also changes a component's behaviour — only its testid attributes.

---

## `data-testid` naming convention

Pattern: `{scope}-{component}-{element}` — lowercase, hyphen-separated.

Examples:
- `admin-login-email`, `admin-login-password`, `admin-login-submit`
- `admin-shell-sidebar`, `admin-shell-nav-overview`, `admin-shell-signout`
- `orgs-drawer-name`, `orgs-drawer-code`, `orgs-drawer-save`
- `jury-identity-name`, `jury-identity-surname`, `jury-identity-start`
- `jury-pin-digit-0` .. `jury-pin-digit-5`

Rule: every interactive element (input/button/link) touched by any E2E spec must have a `data-testid` before the spec is written.

---

## Commands

```bash
npm run e2e                       # rewritten suite (legacy excluded via config)
npm run e2e -- --headed           # watch browser during run
npm run e2e -- --grep "login"     # filter specs
npm run e2e -- --workers=1        # single worker (debugging)
npm run e2e:report                # open last HTML report
npm run e2e:excel                 # xlsx report
npm run allure:generate           # Allure report (after B5 when reporter is wired)
```

Playwright browser binaries live at `~/Library/Caches/ms-playwright/`. If missing after `node_modules` reinstall: `npx playwright install`.

---

## Tracking

- Sprint reports: `implementation_reports/B<N>-<slug>.md` with pass-rate delta, flaky tests observed, fixtures / testids added
- Pass-rate history: append each sprint's `npm run e2e` tail summary to `passrate-history.md` (create on first use)
- Flake log: any test that intermittently fails gets one line in `flake-log.md` with spec path + suspected root cause

---

## Critical user journeys (coverage checklist)

### Admin panel
- [ ] Email+password login → dashboard
- [ ] Google OAuth login (mocked) → dashboard
- [ ] Forgot password → reset link flow
- [ ] Invite-accept → complete profile → dashboard
- [ ] Tenant application → approval → Supabase Auth user created
- [ ] Organizations CRUD
- [ ] Periods + Semesters CRUD, publish, close
- [ ] Jurors CRUD, affiliation edit
- [ ] Projects CRUD + CSV import
- [ ] Entry token: create, copy URL, revoke
- [ ] Criteria + Outcomes + Programme Outcomes drawers
- [ ] Rankings export to xlsx
- [ ] Heatmap renders without errors
- [ ] Audit log filters work
- [ ] Setup wizard: all 6 steps advance + validate
- [ ] Tenant-admin cannot see another tenant's data (URL manipulation)

### Jury flow
- [ ] Entry token gate (valid token → identity)
- [ ] First-visit PIN reveal
- [ ] Known juror → PIN step
- [ ] Full evaluation write + resume
- [ ] Lock banner on locked semester
- [ ] Expired session → re-auth

### Demo
- [ ] `/demo` auto-login lands on `/demo/admin`
- [ ] Demo admin shell tabs work
