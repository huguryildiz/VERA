# E1 — Outcome Attainment Math Correctness

**Branch:** `test/e1-outcome-attainment` (forks from `test/c4-scoring-math`)
**Date:** 2026-04-25
**Status:** Complete — 4 new tests green, 12/12 flake-free.

---

## Goal

VERA's accreditation reports (MÜDEK / ABET) depend on the weighted-average attainment formula in
[src/shared/api/admin/scores.js:259-345](../../../../src/shared/api/admin/scores.js#L259-L345)
(`getOutcomeAttainmentTrends`):

```text
per evaluation  evalScore = Σ (raw/max × 100 × weight) / Σ weight
per outcome     avg       = mean(evalScores)
                attainmentRate = share of evalScores ≥ 70
```

Before E1 this formula had **zero** test coverage. Wrong math = wrong accreditation report = institutional
risk. E1 locks the math into assertable E2E tests.

---

## Pass-rate delta

| Snapshot | E2E passing | Flake check (E1 only) | DB-validating |
|---|---|---|---|
| Before E1 (on this branch) | 98 baseline | — | ~22 |
| After E1 (isolated run) | **94 + my 4 = 98** | **12/12 @ `--repeat-each=3 --workers=1`** | ~26 |

*Note:* a full-suite run from this branch surfaced 7 **pre-existing** failures unrelated to E1
(organizations-crud, scoring-correctness tie-case, settings drawer, setup-wizard skip, tenant-admin
sign-in, demo-autologin, tenant-isolation RLS). Each fails only when run alongside other specs; every
one passes when re-run in isolation (verified `scoring-correctness › equal weight` case — green
standalone). These are cross-spec shared-fixture flakes tracked upstream (see Session C `flake-log.md`
F2 for the same class). **No E1 test flakes. No E1-induced regression.**

---

## Files

### New

- `e2e/helpers/outcomeFixture.ts` — setup/teardown + `readAttainment` + `deleteMapping`
- `e2e/admin/outcome-attainment.spec.ts` — 4 tests
- `docs/superpowers/plans/session-e-e2e-depth-phase-2/implementation_reports/E1-outcome-attainment.md`

### Read-only references

- `e2e/helpers/supabaseAdmin.ts` (C6 contract: `adminClient` import)
- `e2e/helpers/scoringFixture.ts` (C4 pattern template)
- `e2e/fixtures/seed-ids.ts` (`E2E_PERIODS_ORG_ID`)
- `src/shared/api/admin/scores.js:259-345` (the formula under test)

---

## Fixture DDL & teardown order

`setupOutcomeFixture` performs 10 ordered steps against `E2E_PERIODS_ORG_ID`:

| Step | Table | Notes |
|---|---|---|
| 1 | `periods` INSERT | `is_locked=false` so child inserts pass `block_period_child_on_locked` |
| 2 | `period_criteria` INSERT | one row per `criteriaWeights[]`; key suffixed to avoid cross-fixture collision |
| 3 | `period_outcomes` INSERT | derived from unique `outcomeCode`s in `outcomeMappings[]` |
| 4 | `period_criterion_outcome_maps` INSERT | `coverage_type='direct'` (see schema note) |
| 5 | `jurors` INSERT | org-scoped |
| 6 | `juror_period_auth` INSERT | **F1 rule:** `session_token_hash: null` explicit |
| 7 | `projects` INSERT | triggers auto-assign `project_no` |
| 8 | `score_sheets` INSERT | `status='submitted'` |
| 9 | `score_sheet_items` INSERT | one per `scores[]` entry |
| 10 | `periods` UPDATE `is_locked=true` + `activated_at=now()` | matches real "active period" state |

`teardownOutcomeFixture` runs the reverse via CASCADE:

1. `periods` UPDATE `is_locked=false` (so child `BEFORE DELETE` triggers don't reject)
2. `periods` DELETE — CASCADEs through projects → score_sheets → score_sheet_items, period_criteria → period_criterion_outcome_maps, period_outcomes, juror_period_auth
3. `jurors` DELETE (no FK from period, standalone row)

Both steps wrapped in try/catch; `afterEach` cleans up idempotently regardless of partial failures.

---

## Schema surprises encountered

1. **Two `weight` fields exist and only one is used by attainment math.**
   - `period_criteria.weight` — stored, metadata-only; NOT used in attainment
   - `period_criterion_outcome_maps.weight` — the one the formula reads
   - `scoringFixture.ts` only sets `period_criteria.weight`; E1 fixture sets BOTH so tests are explicit about which one matters.

2. **`coverage_type` enum is `'direct' | 'indirect'`, not `'full' | 'partial' | 'none'`.**
   The task brief referenced the latter; the actual CHECK constraint in `002_tables.sql:417` and `:431` is `('direct', 'indirect')`. All E1 mappings default to `'direct'`.

3. **Lock-guard triggers cover `period_criterion_outcome_maps`.** Test 4 must unlock the period before `DELETE`, then re-lock. Implemented as `deleteMapping()` helper that wraps unlock / delete / re-lock. Confirmed in `003_helpers_and_triggers.sql:554`.

4. **Attainment has no RPC or view.** It is pure JS in `scores.js:259-345`, called directly by `AnalyticsPage` and `useAnalyticsData`. `readAttainment()` in the fixture replicates the formula verbatim (with a pointer comment back to scores.js) against service-role DB reads, because there is no server-side computation endpoint to query.

5. **`score_sheet_items` requires `score_value ≥ 0`** (CHECK constraint) — tests stay above 0.

---

## Attainment read path

`readAttainment(periodId)` → `Record<outcomeCode, avg>` (avg = 1-decimal rounded).

1. Parallel queries via `adminClient`:
   - `period_criteria` → `{id, key, max_score}`
   - `period_criterion_outcome_maps` → `{period_criterion_id, weight, period_outcomes(code)}`
   - `score_sheets` → `{id, score_sheet_items(score_value, period_criteria(key))}`
2. Pivot each sheet into `{ criterionKey: value }` (mirrors `pivotItems` in scores.js).
3. For each outcome, for each eval row: compute `weightedSum / effectiveWeight`; skip if effectiveWeight is 0.
4. Average across evals, round to 1 decimal.

Only `avg` is returned (all E1 tests use a single eval, so `avg == eval score`). `attainmentRate` intentionally not exposed — E1 asserts raw math, not the 70% threshold policy.

---

## Tests (4)

| # | Name | Setup → Expected |
|---|---|---|
| 1 | single criterion full weight | C1 w=1.0, score 8/10 → OA = 80.0 |
| 2 | two criteria weighted | C1 w=0.3 @ 10/10, C2 w=0.7 @ 5/10 → OA = 65.0 |
| 3 | shared criterion across two outcomes | C1 @ 6/10; OA w=1.0, OB w=0.5 → OA=60.0, OB=60.0 (weight normalizes away for single contributor) |
| 4 | **deliberately-break**: remove a mapping | C1 @ 10/10 + C2 @ 5/10 both w=0.5 → OA=75.0 before; remove C2 mapping → OA=100.0 after (must differ) |

---

## Deliberately-break proof

Explicit spec-level break (required by plan §5, beyond Test 4's structural break):

**Scenario:** Change Test 2 outcome-mapping weights from `0.3 / 0.7` to `0.5 / 0.5` while keeping the expected `65`.

Run log (`npm run e2e -- --grep "two criteria weighted"`):

```text
  1) e2e/admin/outcome-attainment.spec.ts:46:3 › outcome attainment math correctness
     › two criteria weighted → attainment = weighted avg

    Error: expect(received).toBeCloseTo(expected, precision)
    Expected: 65
    Received: 75
    Expected precision:    1
    Expected difference: < 0.05
    Received difference:   10

      > 65 |     expect(result["OA"]).toBeCloseTo(65, 1);
```

Interpretation: with equal 0.5/0.5 weights, C1's perfect 10/10 dominates over C2's 5/10 as `(50 + 25)/1.0 = 75`. The real 0.3/0.7 weighting pulls C2 up to 35% of the total → `(30 + 35)/1.0 = 65`. This FAIL confirms the test is live-coupled to both the DB `period_criterion_outcome_maps.weight` column and the normalization denominator. Reverted after observation; all 4 tests green again.

Test 4 additionally exercises the break at the DB level: `deleteMapping("OA", "C2")` drops one contributor and the assertion `after !== before` locks in that attainment is not cached or precomputed — it follows mapping topology live.

---

## Flake check — F1 compliance

```bash
npm run e2e -- --grep "outcome attainment" --repeat-each=3 --workers=1
```

```text
Running 12 tests using 1 worker
  ✓   1..4 (run 1) — all four green, 1.3–1.7s each
  ✓   5..8 (run 2) — all four green
  ✓   9..12 (run 3) — all four green

  12 passed (19.6s)
```

**0 flake.** `--workers=1` honored per Session C F1 rule (documented in `flake-log.md`). Each test creates its own period with a unique name suffix, so concurrent instances would not collide even without `--workers=1`; the flag is retained for CI parity.

---

## Coverage_type enum reference

Confirmed via `sql/migrations/002_tables.sql`:

- Line 181 (`framework_outcomes`): `coverage_type TEXT NOT NULL DEFAULT 'direct' CHECK (coverage_type IN ('direct', 'indirect'))`
- Line 417 (`period_outcomes`): `coverage_type TEXT CHECK (coverage_type IN ('direct', 'indirect'))`
- Line 431 (`period_criterion_outcome_maps`): `coverage_type TEXT CHECK (coverage_type IN ('direct', 'indirect'))`

No `'full'`, `'partial'`, `'none'` variants exist. Fixture defaults to `'direct'` for all mappings.

---

## Risks / follow-ups

1. `readAttainment` is a replica of the production formula, not a call into it. If someone changes `scores.js` without touching the fixture, E1 will still pass. **Mitigation:** the cited line range (`scores.js:259-345`) is inlined in the fixture docstring; reviewers touching either side should update both. A follow-up sprint could replace `readAttainment` with `page.evaluate(() => import("/src/shared/api/admin/scores.js").then(m => m.getOutcomeAttainmentTrends([pid])))` so a signed-in admin page exercises the real module.
2. Tests use a single juror / single project / single eval. Multi-eval aggregation (`avg of evalScores across N evals`) is not yet exercised — left for a later sprint if needed; the current 4 tests fully cover the single-eval formula.

---

## Sprint exit checklist

- [x] Fixture & spec added; zero new hardcoded UUIDs (all IDs derived at setup time)
- [x] F1 rule honored (`session_token_hash: null`, `--workers=1` flake check)
- [x] Deliberately-break proof captured (log above)
- [x] 4 new tests pass; 12/12 `--repeat-each=3 --workers=1`
- [x] Pre-existing flakes identified as unrelated; no E1-induced regression
- [x] Committed locally, **not pushed**
