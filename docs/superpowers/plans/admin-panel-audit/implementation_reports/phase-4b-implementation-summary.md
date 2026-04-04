# Phase 4b Implementation Summary

**Date:** 2026-04-04
**Branch:** `refactor/folder-restructure`
**Scope:** Phase 4b — config.js elimination (jury side + required params)

---

## Pre-Implementation State (Window 3 start)

The repo was already further along than the plan anticipated when Window 3 began:

- `src/config.js` — already deleted ✅
- `src/shared/constants.js` — already created with BAND_COLORS, RUBRIC_*, MUDEK_*, CRITERIA ✅
- `src/jury/utils/scoreState.js` — had `criteria = []` defaults, no config.js import ✅
- `src/jury/utils/scoreSnapshot.js` — had `criteria = []` default, no config.js import ✅
- `src/jury/utils/progress.js` — had `criteria = []` default, no config.js import ✅
- Test files — all already clean, no CRITERIA from config imports ✅

**Baseline:** 301/301 tests passing.

The intermediate state (`criteria = []`) was a valid intermediate step from an earlier session.
Window 3 completed the migration by making `criteria` a fully required parameter and fixing
the one call site that was omitting it.

---

## What Was Done

### 1. Made `criteria` a required param — `src/jury/utils/scoreState.js`

Removed `= []` defaults from all 6 exported functions. Updated header comment.

| Function | Before | After |
|----------|--------|-------|
| `isAllFilled(scores, pid, criteria)` | `criteria = []` | no default |
| `isAllComplete(scores, projects, criteria)` | `criteria = []` | no default |
| `countFilled(scores, projects, criteria)` | `criteria = []` | no default |
| `makeEmptyScores(projects, criteria)` | `criteria = []` | no default |
| `makeEmptyTouched(projects, criteria)` | `criteria = []` | no default |
| `makeAllTouched(projects, criteria)` | `criteria = []` | no default |

### 2. Made `criteria` a required param — `src/jury/utils/scoreSnapshot.js`

Removed `= []` default from `buildScoreSnapshot(scores, comment, criteria)`.
Updated inline comment from "defaults to CRITERIA from config.js" to
"requires explicit criteria".

### 3. Made `criteria` a required param — `src/jury/utils/progress.js`

Removed `= []` default from `buildProgressCheck(projectList, seedScores, options, criteria)`.

### 4. Fixed call site — `src/jury/hooks/useJuryScoreHandlers.js`

Line 27 was calling `isAllFilled(newScores, pid)` without the criteria argument.

```js
// Before (bug):
if (!isAllFilled(newScores, pid)) {

// After (fixed):
if (!isAllFilled(newScores, pid, effectiveCriteria)) {
```

**Bug impact:** With `= []` as default, `[].every(...)` is vacuously `true`, so the
`groupSynced` flag was never cleared when a user typed a new score. This meant
partially-scored groups stayed in "synced" state even after new edits. Now it correctly
checks against the actual period criteria.

---

## Files Changed

| # | File | Change |
|---|------|--------|
| 1 | `src/jury/utils/scoreState.js` | Removed `= []` defaults from 6 functions; updated comment |
| 2 | `src/jury/utils/scoreSnapshot.js` | Removed `= []` default from `buildScoreSnapshot`; updated comment |
| 3 | `src/jury/utils/progress.js` | Removed `= []` default from `buildProgressCheck` |
| 4 | `src/jury/hooks/useJuryScoreHandlers.js` | Fixed `isAllFilled(newScores, pid)` → `isAllFilled(newScores, pid, effectiveCriteria)` |
| 5 | `docs/…/2026-04-admin-panel-audit-plan.md` | Updated Component Parity Tracker, Phase Parity Tracker, Window table |

---

## Grep Audit Results

All forbidden patterns: 0 hits.

```text
import CRITERIA from config          →  0 hits (config.js deleted)
criteria = CRITERIA default          →  0 hits
|| CRITERIA fallback                 →  0 hits
TOTAL_MAX in actual code             →  0 hits (only in comment in constants.js)
APP_CONFIG in actual code            →  0 hits (only in comment in constants.js)
getCriterionById in actual code      →  0 hits (only in comment in constants.js)
criteria = [] in src/jury/ utils     →  0 hits (all 3 files cleaned)
```

Remaining `criteria = []` occurrences in admin-side components/hooks and React component
prop defaults are legitimate prop defaults, not config.js fallbacks. Rule 6 (fallback yasağı)
targets implicit config.js fallbacks, not React prop defaults.

---

## Test Results

```
Test Files  38 passed (38)
Tests      301 passed (301)
Duration   ~4.5s
```

All 301 tests pass with zero failures.

---

## Notes

### CRITERIA still in constants.js

`CRITERIA` is exported from `src/shared/constants.js` and remains there intentionally:

- `src/shared/criteria/defaults.js` imports it to build the default `criteria_config` seed
  when creating a new evaluation period. This is a legitimate use (initial seed, not a
  runtime fallback).
- `src/admin/__tests__/CriteriaManager.test.jsx` imports it for test fixture data.

Plan item B14 explicitly permits: "Accept criteria array as param or import from constants
(for seed defaults only)." These two consumers are the only ones and both fall under that
exception.

---

## Next Window Preconditions

Window 4 (Phase 5-6: PinBlockingPage backend wiring + Import CSV activation) can start
immediately:

- All 301 tests passing ✅
- No forbidden config.js patterns anywhere in src/ ✅
- Jury utils fully decoupled from config.js — criteria required at every call site ✅
- config.js deleted ✅
