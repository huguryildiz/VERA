VERA — Session F F2: Shallow Test Mop-Up (Aggressive Delete Strategy)

## Your job

Delete pure render-smoke test files from `src/admin/`. Remove their qa-catalog.json entries.
Run `npm test -- --run` to verify 0 failures. Write an implementation report.

## Context

VERA is a multi-tenant academic jury platform (React + Vitest). Session F is improving
unit test quality. F2 is the aggressive shallow cleanup step.

**Quality rule:** Tests that only do `container.firstChild.toBeTruthy()`,
`document.body.textContent.length > 0`, or check only a static heading string like
`getByText("Drawer Title")` with zero behavior assertion are pure render smoke → DELETE.

**Before deleting any file:** Check if the component has another test file in the repo.
If it's the ONLY test file for that component, document it in Known Gaps (don't silently
drop coverage). If another test exists, delete freely.

**Aggressive strategy:** Borderline cases (single static heading check, zero behavior) →
DELETE, not upgrade. Upgrading shallow tests costs the same as writing from scratch.

## Step 1: Read and evaluate pre-identified DELETE candidates

Read each file first, confirm it's shallow, then delete:

1. `src/admin/shared/__tests__/PinPolicyDrawer.test.jsx`
2. `src/admin/features/reviews/__tests__/ReviewMobileCard.test.jsx`
3. `src/admin/features/entry-control/__tests__/RevokeTokenModal.test.jsx`
4. `src/admin/features/entry-control/__tests__/EntryTokenModal.test.jsx`
5. `src/admin/features/outcomes/components/__tests__/FrameworkSetupPanel.test.jsx`
6. `src/admin/features/audit/__tests__/AuditEventDrawer.test.jsx`
7. `src/admin/features/criteria/__tests__/StarterCriteriaDrawer.test.jsx`
8. `src/admin/features/jurors/__tests__/JurorReviewsModal.test.jsx`
9. `src/admin/features/outcomes/__tests__/AddOutcomeDrawer.test.jsx`
10. `src/admin/features/settings/__tests__/EditProfileDrawer.test.jsx`

For #7–10: delete if the ONLY assertions are static heading/title text with no behavior.

## Step 2: Scan newly-created test directories

The following appeared as `??` in git status — check everything inside for shallow tests:

- `src/admin/features/criteria/components/__tests__/`
- `src/admin/features/jurors/components/__tests__/`
- `src/admin/features/outcomes/components/__tests__/`
- `src/admin/features/periods/components/__tests__/`
- `src/admin/features/projects/components/__tests__/`
- `src/admin/features/periods/__tests__/PeriodsModals.test.jsx`
- `src/admin/features/pin-blocking/__tests__/PinModals.test.jsx`
- `src/admin/features/organizations/__tests__/TenantSwitcher.test.jsx`
- `src/admin/features/criteria/__tests__/CoverageBar.test.jsx`
- `src/admin/features/criteria/__tests__/PureCriteriaComponents.test.jsx`

Also check these — were deleted in P2-Fix but may have been recreated in A5:

- `src/admin/features/analytics/__tests__/AnalyticsTab.test.jsx`
- `src/admin/features/rankings/__tests__/ScoresTab.test.jsx`
- `src/admin/features/settings/__tests__/SettingsComponents.test.jsx`

Apply the same delete criteria to everything you find.

## Step 3: DO NOT delete these (verified real assertions)

- `src/admin/features/heatmap/__tests__/HeatmapMobileList.test.jsx` — empty state text = real contract
- `src/admin/analytics/__tests__/captureChartImage.test.js` — null element → null (edge case)
- `src/admin/analytics/__tests__/captureSvgForPdf.test.js` — null element → false (edge case)
- `src/admin/utils/__tests__/exportXLSX.test.js` — filename regex, pure logic
- `src/admin/utils/__tests__/downloadTable.test.js` — arrayBufferToBase64, pure logic
- `src/admin/features/criteria/__tests__/CriteriaConfirmModals.test.jsx` — disabled state behavior

## Step 4: Update qa-catalog.json

For EVERY file you delete, BEFORE deleting:

1. Read the test file and note all `qaTest("some.id", ...)` IDs
2. Remove exactly those IDs from `src/test/qa-catalog.json`

Surgical: only remove entries for deleted tests, don't touch other entries.

## Step 5: Run tests and write report

```bash
npm test -- --run
```

Verify 0 failures.

Write implementation report to:
`docs/superpowers/plans/session-f-test-gap-closure/implementation_reports/F2-shallow-mop-up.md`

Include:

- Files deleted (with IDs removed from catalog)
- Files scanned but kept (with reason)
- Components with no other test file → Known Gaps list
- Final test count and file count from test run

## Rules

- NEVER commit
- If a file has MIXED content (some real assertions alongside smoke): keep it, note it
- Only delete files where ALL assertions are pure render smoke or static string checks
- Read and extract IDs BEFORE deleting files
