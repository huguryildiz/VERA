# E4 Implementation Report — Export Row Integrity + Period Lifecycle

**Sprint:** Session E — E2E Depth Phase 2, Sprint E4
**Branch:** `test/e4-export-lifecycle`
**Date:** 2026-04-25

## Tests Implemented

### Topic A — Export Row Integrity (`e2e/admin/rankings-export.spec.ts`)

**`test.describe("export row integrity")`** — 2 tests, serial mode

- **`beforeAll`**: `setupScoringFixture({ aMax: 30, bMax: 70, namePrefix: "E4 Export" })` + `writeScoresAsJuror` (p1: a=25, b=40 → total=65; p2: a=10, b=20 → total=30)
- **`afterAll`**: `teardownScoringFixture`

**E4-1: XLSX export — all project totals match DB score sums**
- Navigates to rankings with explicit `shell.selectPeriod(e4Fixture.periodId)`
- Downloads XLSX, finds `Average` column (regex `/^Average\b/i`) and `Rank` column
- Asserts p1 total = 65, p2 total = 30
- Asserts p1 rank < p2 rank (higher score = lower rank number)

**E4-2: deliberately-break — mutating DB score invalidates prior export total**
- Proof 1: captures pre-mutation XLSX; asserts p1 total = 65
- Mutation: `writeScoresAsJuror` updates p1 to a=5, b=5 → new total = 10
- Re-navigates + `shell.selectPeriod` forces fresh data load
- Proof 2: asserts post-mutation total ≠ 65 (stale cache not served)
- Proof 3: asserts post-mutation total = 10 (export reflects DB truth)

### Topic B — Period Lifecycle (`e2e/admin/periods.spec.ts`)

**`test.describe("periods lifecycle — publish + close write-block")`** — 2 tests, serial mode

**E4-3: draft period → publish → DB is_locked=true + status=Published**
- Seeds ready period via service-role `adminClient`:
  - `periods`: `criteria_name = "E4 Evaluation Criteria"`, `is_locked = false`
  - `period_criteria`: `weight = 100`, `max_score = 100`, `rubric_bands = [{ label: "Pass", min_score: 0, max_score: 100 }]`
  - `projects`: 1 project with `members = []`
- Waits for `.periods-readiness-badge.ready` (15s timeout) — publish button gated on this
- Publishes via `periods.clickPublishFor` + `periods.confirmPublish`
- Asserts UI status pill = "Published"
- Asserts DB `is_locked = true` via service-role query
- `try/finally` teardown: unlock → delete period (cascades criteria, projects)

**E4-4: scored period close → rpc_jury_upsert_score returns period_closed**
- Sets up isolated scoring fixture (`setupScoringFixture({ namePrefix: "E4 Close" })`)
- Writes scores (p1: a=15, b=35; p2: a=20, b=40)
- Updates `juror_period_auth.session_token_hash` to SHA-256 of rawToken — required because scoringFixture leaves hash null (F1 rule), and `rpc_jury_upsert_score` checks `IS NULL OR !=` before `period_closed`
- Closes period via UI: `periods.clickCloseFor` + `periods.confirmClose`
- Asserts status pill = "Closed"
- Calls `rpc_jury_upsert_score` via `adminClient.rpc(...)` with `p_scores: []` (period_closed check fires before score processing)
- Asserts `rpcResult.error_code === "period_closed"`
- `try/finally` teardown: reset `is_locked=false, closed_at=null` → delete period → delete juror

## Flake Check Result

```
npm run e2e -- --grep "export|periods" --repeat-each=3 --workers=1
```

**42 passed, 3 skipped** (skips = pre-existing one-shot lifecycle test that consumed its seeded period)
Zero failures across all 3 repetitions.

## Key Implementation Notes

- **`.catch()` on Supabase builder**: `PostgrestBuilder` does not expose `.catch()` on the chained query object — teardown used bare `try/catch` blocks instead (matching `teardownScoringFixture` pattern).
- **Session token ordering in RPC**: `rpc_jury_upsert_score` checks `session_token_hash IS NULL OR !=` at line 497 of `005_rpcs_jury.sql` — before the `period_closed` check at line 510. An explicit UPDATE to set a non-null hash is mandatory for E4-4 to reach the intended guard.
- **Readiness gate**: `rpc_admin_check_period_readiness` requires (1) `criteria_name` non-null, (2) ≥1 criterion with `weights sum = 100` and non-empty `rubric_bands` JSONB array, (3) ≥1 project. All three seeded inline in E4-3.
- **scoringFixture project title prefix**: fixture always uses "C4 P1" / "C4 P2" as project title prefixes regardless of `namePrefix`; XLSX row matching via `.includes("C4 P1")` is safe when fixture period is explicitly selected.
