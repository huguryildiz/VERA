# F3 Business Logic — Implementation Report

## Summary

Added 4 new `qaTest` cases across 2 existing selector test files. All 917 tests pass with 0 failures.

---

## IDs Added to qa-catalog.json

| ID | Area | Story |
|----|------|-------|
| `overview.sel.03` | overviewMetrics | `computeNeedsAttention` — boundary: `totalJurors=0`, status-overrides-progress, empty arrays |
| `overview.sel.04` | overviewMetrics | `computeTopProjects` — tie at 3rd position (stable sort), all-null totalAvg with ≥5 projects |
| `grid.sel.07` | gridSelectors | `computeGroupAverages` — juror absent from lookup, partial cell state excluded, mixed jurors |
| `grid.sel.08` | gridSelectors | `buildExportRowsData` — empty groups array, juror completely absent from lookup |

---

## Edge Cases Covered

### overviewMetrics.test.js

**overview.sel.03 — computeNeedsAttention boundary**

- `totalJurors = 0`: The filter `completed < totalJurors` becomes `0 < 0` → false → no incomplete projects even when completedEvals is 0. Previously untested zero-juror state.
- `status = "not_started"` with `progress > 0`: The OR condition in the stale filter means a juror flagged as `not_started` is still surfaced even if their progress counter is non-zero. Prevents a silent miss if a juror's progress gets reset but status flag lags.
- Empty arrays `[]` (not null): Confirms the `?? []` guards work for true empty inputs, not just null.

**overview.sel.04 — computeTopProjects tie-breaking**

- Tie at rank 3 (two projects both at `totalAvg = 80`): JavaScript's stable sort preserves original input order for equal items — the first-appearing project takes rank 3. Tests that this behavior is deterministic across renders.
- All-null totalAvg with ≥5 projects: The `.filter(p => p.totalAvg != null)` removes every entry, so `slice(0, 3)` operates on `[]` and returns `[]`. Prevents a NaN or undefined rank from appearing in the overview card.

### gridSelectors.test.js

**grid.sel.07 — computeGroupAverages edge cases**

- Juror completely absent from lookup (`lookup["j2"]` is `undefined`): Optional chaining `lookup[j.key]?.[g.id]` returns `undefined` → `getCellState(undefined)` → `"empty"` → excluded. Tests that missing jurors produce no contribution and no crash.
- Juror with partial scores (only 1 of 2 criteria filled): `getCellState` returns `"partial"` → the `=== "scored"` guard rejects it → `null` → filtered by `Number.isFinite`. Group average is `null`, not a partial number.
- Three jurors across two groups with mixed scored/partial/absent states: Verifies each group's average is computed independently using only the valid scored entries for that group.

**grid.sel.08 — buildExportRowsData edge cases**

- Empty groups array `[]`: `safeGroups.forEach` never runs → `scores = {}` per row. No crash. Export row is still emitted with the correct name/dept/statusLabel.
- Juror completely absent from lookup (`lookup = {}`): `lookup[juror.key]?.[g.id]` evaluates to `undefined` → `entry ?? null` → `null` → score is `null` for every group. No TypeError.

---

## Final Test Count

- Before: 913 tests across 234 files
- After: **917 tests** across 234 files (+4 new `qaTest` cases)
- Failures: **0**
