VERA — Session F F3: Business Logic Tests

## Your job

Add meaningful unit tests for edge cases in admin selector functions. Extend existing
test files — do not create new ones. Update qa-catalog.json. Run `npm test -- --run`.

## Context

VERA is a multi-tenant academic jury platform. The admin panel computes derived data
from raw scores via pure selector functions. These need deeper edge-case coverage.

## Step 1: Read source and existing tests

1. `src/admin/selectors/overviewMetrics.js` — exports: `computeNeedsAttention`, `computeTopProjects`
2. `src/admin/selectors/__tests__/overviewMetrics.test.js` — existing 3 tests, see what's covered
3. `src/admin/selectors/gridSelectors.js` — exports: `buildLookup`, `buildJurorFinalMap`, `filterCompletedJurors`, `computeGroupAverages`, `buildExportRowsData`
4. `src/admin/selectors/__tests__/gridSelectors.test.js` — existing 7 tests, see what's covered
5. `src/test/qa-catalog.json` — find existing IDs to avoid conflicts, understand format

## Step 2: Add edge case tests to overviewMetrics.test.js

### computeTopProjects

This function shows top 3 projects but only when ≥5 projects exist. Read the actual
implementation, then test:

- Fewer than 5 projects → returns empty / no ranking (verify actual behavior first)
- Exactly 5 projects → top 3 returned
- Ties at 3rd position → verify the tie-breaking logic, test it
- Projects with null/missing scores → how are they ranked? Test it.

### computeNeedsAttention

Read what this function does. Test the boundary condition — what is the threshold?

- Items exactly AT the threshold
- Items BELOW threshold
- Empty input

## Step 3: Add edge case tests to gridSelectors.test.js

### computeGroupAverages

Read the implementation. Test:

- Juror with no scores → what does it return? Test that behavior.
- Juror with some null scores, some numeric → verify only non-null values contribute
- Multiple jurors, mixed completion rates → verify each gets correct independent average

### buildExportRowsData (if not already covered)

- Empty projects array → returns empty array without crashing
- Projects with missing juror data → no crash

## Step 4: Extend existing test files — do not create new ones

Add new tests directly inside:

- `src/admin/selectors/__tests__/overviewMetrics.test.js`
- `src/admin/selectors/__tests__/gridSelectors.test.js`

## Step 5: Update qa-catalog.json

Read existing IDs in those test files to understand the naming pattern. Add new entries
to `src/test/qa-catalog.json` BEFORE using them in tests.

## Step 6: Run tests and write report

```bash
npm test -- --run
```

Verify 0 failures.

Write implementation report to:
`docs/superpowers/plans/session-f-test-gap-closure/implementation_reports/F3-business-logic.md`

Include: edge cases covered, IDs added, final test count.

## Rules

- NEVER commit
- Read source code FIRST — understand actual behavior before writing assertions
- Do not repeat happy-path tests already in the existing files
- Do not create new test files
- Run and verify 0 failures before writing report
