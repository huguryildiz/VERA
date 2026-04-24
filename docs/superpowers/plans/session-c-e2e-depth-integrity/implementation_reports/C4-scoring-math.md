# C4 — Scoring math correctness + export sum

**Sprint:** C4 — Criteria weight → ranking hesap doğruluğu (P1)
**Branch:** `test/c4-scoring-math` (from `test/c3-pin-lifecycle`)
**Date:** 2026-04-24

---

## Summary

Added three E2E tests that verify the scoring pipeline end-to-end: a raw-score
fixture is planted via service role, the admin rankings page is loaded, and the
displayed totals plus the XLSX export are asserted against known expected
values. Previously, no test checked that criteria scaling actually drove the
ranking output — only that the criteria drawer closed on save.

Also added a closing-the-gap export assertion noted as "remaining from C2" —
XLSX total value parity with DB raw score sum.

## Deliverables

| File | Status |
|---|---|
| `e2e/helpers/scoringFixture.ts` | **NEW** — setup/write/reweight/teardown helpers |
| `e2e/admin/scoring-correctness.spec.ts` | **NEW** — 3 tests (asymmetric, export, tie) |
| `src/admin/features/rankings/components/RankingsTable.jsx` | **MODIFIED** — added `rankings-row-<id>` + `rankings-row-score-<id>` testids |
| `docs/superpowers/plans/session-c-e2e-depth-integrity/flake-log.md` | **MODIFIED** — F2 entry for log-export-event Edge Function cold start |

## Pass-rate delta

| Snapshot | Passing | Failing | Skip | DB-validating | Honest coverage |
|---|---|---|---|---|---|
| C3 exit baseline | 88 / 89 | 0 | 1 | ~13 | 6.0 / 10 |
| **C4 exit** | **~91 / 92** (3 new tests, +3 passing) | **0 attributable to C4** | 1 | **~16** (3 new DB-validating tests) | **6.5 / 10** |

Note: The full `npm run e2e` run after C4 showed **98 passed, 2 failed, 2 skipped, 3 did not run**. Both failures (`organizations-crud create` and `forgot-password success banner`) are pre-existing flakes unrelated to C4 — they do not touch scoring, rankings, or any table my fixture mutates. Isolated re-run of `organizations-crud` reproduces the same failure without my branch loaded; it is not attributable.

## Tests added

All three live in one describe with `test.describe.configure({ mode: "serial" })`, one shared fixture via `beforeAll`, idempotent `afterAll` teardown.

### 1. `asymmetric weight (A max=30, B max=70) produces expected ranking`

- Fixture: Criterion A `max_score=30, weight=30`, Criterion B `max_score=70, weight=70`.
- Scores: P1 maxes A → raw sum **33**. P2 maxes B → raw sum **73**.
- Assertions:
  - `rankings-row-score-<p1Id>` text is `"33.0"`.
  - `rankings-row-score-<p2Id>` text is `"73.0"`.
  - `boundingBox()` of P2 row is above P1 row (P2 ranks higher).

### 2. `XLSX export total matches DB raw score sum`

- Reuses the asymmetric fixture (no reweight between tests 1 and 2).
- Waits for both row-score testids before opening the export panel (without this, the export serializes an empty `filteredRows` and the test drops into "C4 P1 row must appear" assertion failure).
- Downloads XLSX → `readXLSX(filePath)` → find column matching `/^Average\b/i` (actual header is `"Average (100)"` — totalMax is 30+70).
- Looks up P1 and P2 rows by `includes("C4 P1") / "C4 P2"` on the `Project Title` column (export emits `"P<n> — <title>"` format).
- Asserts numeric equality to DB raw sum: 33 and 73.

### 3. `equal weight (A=50, B=50) with symmetric scores produces a tie`

- `reweightFixture(fixture, 50, 50)` — unlock, wipe score_sheets, update both criteria to `max_score=50, weight=50`, re-lock with refreshed `activated_at`.
- Scores: P1 (50, 3) → 53, P2 (3, 50) → 53.
- Assertion: both score testids text equal `"53.0"`.
- Rank-column tie handling: VERA's `computeRanks` uses competition-rank semantics (equal totals share a rank, next rank skips), but no `data-testid` on the rank cell exists yet — asserting equal score values is sufficient for tie validation in C4 scope.

## Fixture schema summary (tables touched by `setupScoringFixture`)

Insert order:

1. `periods` — `is_locked: false` initially so subsequent inserts pass the `block_period_*_on_locked` triggers.
2. `period_criteria` — two rows with distinct `sort_order` (0, 1), per-sprint-unique `key` (`c4_a_<suffix>`, `c4_b_<suffix>`) to avoid the `UNIQUE(period_id, key)` constraint on concurrent runs.
3. `projects` — two rows; `project_no` auto-assigned by the `assign_project_no` BEFORE INSERT trigger.
4. `jurors` — one row in `E2E_PERIODS_ORG_ID`.
5. `juror_period_auth` — **composite PK (juror_id, period_id)**, `session_token_hash: null` per flake-log F1.
6. `UPDATE periods SET is_locked=true, activated_at=now()` — lock it so `pickDefaultPeriod` auto-selects the fixture period as the admin's default.

Cleanup (`teardownScoringFixture`):

1. `UPDATE periods SET is_locked=false` (triggers allow the `is_locked` column to change even on a locked period).
2. `DELETE FROM periods WHERE id=periodId` — cascades to `projects`, `period_criteria`, `score_sheets` (→ `score_sheet_items`), `juror_period_auth` (period scope).
3. `DELETE FROM jurors WHERE id=jurorId` — cascades any remaining `juror_period_auth` / `score_sheets` rows.

Both steps wrapped in `try/catch` to keep `afterAll` idempotent even when a test ran partially.

## New test IDs

Added in `src/admin/features/rankings/components/RankingsTable.jsx`:

- `rankings-row-<projectId>` on the `<tr>` (used for DOM-order assertion).
- `rankings-row-score-<projectId>` on the `rk-avg-num` span (the displayed `totalAvg.toFixed(1)` value).

No behavior changes — testids are additive.

## Deliberately-break evidence

For each test, its expected value was inverted and the test was run once to prove it fails for the right reason. Originals restored afterwards (sanity run 3/3 green).

**Break #1 — asymmetric math:** In `beforeAll`, append `reweightFixture(fixture, 50, 50)` + rescore `p1:{a:50,b:3}, p2:{a:3,b:50}` (both sum to 53). Spec still asserts "33.0" / "73.0":

```text
Error: expect(locator).toHaveText(expected) failed
Expected: "33.0"
Received: "53.0"
  - Expect "toHaveText" with timeout 5000ms
```

**Break #2 — equal-weight tie:** In the tie test, change scores to `p1:{a:10,b:10}, p2:{a:3,b:50}` (20 vs 53). Assertion still requires "53.0" from P1:

```text
Error: expect(locator).toHaveText(expected) failed
Expected: "53.0"
Received: "20.0"
  - Expect "toHaveText" with timeout 5000ms
```

**Break #3 — XLSX total parity:** Change XLSX numeric assertion to `toBe(999)`:

```text
Error: expect(received).toBe(expected) // Object.is equality
Expected: 999
Received: 33
```

All three fail at the assertion the test is meant to guard. Post-revert sanity run: **3/3 passed in 14.7s**.

## Flake check

```bash
npm run e2e -- --grep "scoring correctness" --workers=1 --repeat-each=3
```

- Run 1: **8 / 9 passed**, 1 failed (XLSX timeout on iteration 3), 1 did not run.
- Run 2: **9 / 9 passed** (40.1s).
- Run 3: **9 / 9 passed** (39.3s).

Aggregate 26 / 27 = 96.3%. The one observed failure was a `page.waitForEvent("download")` timeout after 30s. Screenshot at failure showed the rankings page fully loaded with correct totals (33.0 / 73.0), export panel open, XLSX selected — root cause is the `log-export-event` Edge Function cold-starting when called fewer than ~1/minute. The existing `rankings-export.spec.ts` doesn't hit this because it invokes the function earlier in its describe (CSV test) and warms it before the XLSX assertion.

Not fixed in this sprint — logged as **F2** in `flake-log.md` for the shared Edge Function mitigation to be handled once (e.g., explicit warmup in `globalSetup`), rather than once per dependent spec. C4 relies on the same POM (`RankingsPom`) as the healthy `rankings-export.spec.ts`, so any future warmup fix benefits both.

## Schema surprises worth flagging

- **`period_criteria.weight` is stored but ignored by the ranking pipeline.** `getProjectSummary` (`src/shared/api/admin/scores.js::pivotItems`) computes `total = sum of raw score_values`. No multiplication by `weight`. The *effective* scaling factor is `max_score`, which determines the upper bound of each criterion's contribution to the raw sum. The C4 plan's formula (`30 × 10 + 70 × 3 = 510`) assumed weight-multiplier math that VERA does not implement; fixture values were chosen to yield **unweighted raw sums that still validate the same property** ("asymmetric scaling changes ranking").

  If we later want to test a weight-multiplier model, that's a separate scoring-pipeline change, not a test-only change.

- **`weight` is exercised elsewhere.** `getOutcomeAttainment` (same file, ~line 314) does use `weight` to compute normalized outcome scores — that's the attainment page, not Rankings. Rankings and Heatmap consume `totalAvg` (raw).

- **Period-child tables are trigger-locked.** `block_period_criteria_on_locked` / `block_period_outcomes_on_locked` / `block_period_criterion_outcome_maps_on_locked` all block INSERT/UPDATE/DELETE when `periods.is_locked = true`. The period must be created unlocked, populated, then locked — and must be unlocked again before cleanup. `reweightFixture` follows that unlock → mutate → relock dance.

- **Rankings page's "weight" column does not appear in exports or UI.** The Rankings export labels the total column `"Average (<totalMax>)"` where totalMax = sum of per-criterion `max_score`. My XLSX assertion uses `/^Average\b/i.test(h)` rather than hardcoding `"Average (100)"` — total max varies between tests (30+70=100 in asymmetric, 50+50=100 in equal; same number here by coincidence).

- **Project Title format in export.** Emitted as `"P<n> — <title>"` (e.g. `"P1 — C4 P1 <suffix>"`), not just `title`. My lookup uses `.includes("C4 P1")` / `"C4 P2"` which is stable across `project_no` assignment.

- **Score-sheet tables are NOT trigger-locked by `is_locked`.** `score_sheets` and `score_sheet_items` accept inserts regardless of period lock state — this is the same "closed period still accepts scores" gap C6 noted. C4's fixture exploits this intentionally: we lock the period (to make it the admin default pick) and then upsert sheets under service role.

## Tie handling — observed UI behavior

With both projects displaying `totalAvg = 53.0`:

- `RankingsPage.rankedRows` sorts by `b.totalAvg - a.totalAvg` — stable sort keeps whatever insertion order the query returned.
- `computeRanks` (in `src/admin/features/rankings/components/rankingHelpers.js`) assigns competition-rank: both rows get rank 1, next rank would be 3.
- `MedalCell` shows the rank badge. No `data-testid` is exposed on the rank cell itself.

C4 asserts only the displayed score parity (`"53.0"` on both rows). Tie-rank visual behavior is captured in the test name, not a strict assertion — adding a `rankings-row-rank-<id>` testid later is trivial and can be wired into a follow-up RBAC/analytics sprint if we want to lock in the rank-visibility contract.

## What got reused (no new POM, no new fixtures dir)

- `LoginPom.signIn` — super-admin login with `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD`.
- `AdminShellPom.expectOnDashboard` + `.selectPeriod(periodId)` — explicit period selection (the existing `period-selector-trigger` + `period-popover-item-<id>` testids).
- `RankingsPom.waitForReady` / `.openExportPanel` / `.selectFormat` / `.clickDownloadAndCapture` — **zero POM changes**.
- `readXLSX` from `e2e/helpers/parseExport.ts` (C2).
- `E2E_PERIODS_ORG_ID` from `e2e/fixtures/seed-ids.ts` (C2).
- `adminClient` from `e2e/helpers/supabaseAdmin.ts` (gold standard).

## Commit

Staged:

- `e2e/helpers/scoringFixture.ts`
- `e2e/admin/scoring-correctness.spec.ts`
- `src/admin/features/rankings/components/RankingsTable.jsx` (testid-only change)
- `docs/superpowers/plans/session-c-e2e-depth-integrity/implementation_reports/C4-scoring-math.md`
- `docs/superpowers/plans/session-c-e2e-depth-integrity/flake-log.md` (F2 entry)

Not pushed (per CLAUDE.md — the user controls the push).
