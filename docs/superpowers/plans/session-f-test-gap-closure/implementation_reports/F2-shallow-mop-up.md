# F2: Shallow Test Mop-Up — Implementation Report

Date: 2026-04-25
Strategy: Aggressive delete (borderline = delete)
Result: **234 test files | 913 tests | 0 failures**

---

## Files Deleted

### Step 1 — Pre-identified candidates (all already deleted from disk before this session)

| File | IDs removed from catalog | Verdict |
|------|--------------------------|---------|
| `src/admin/shared/__tests__/PinPolicyDrawer.test.jsx` | `coverage.pin-policy-drawer.renders` (not in catalog) | `container.firstChild.toBeTruthy()` → smoke |
| `src/admin/features/reviews/__tests__/ReviewMobileCard.test.jsx` | `coverage.review-mobile-card.renders` (not in catalog) | `container.firstChild.toBeTruthy()` → smoke |
| `src/admin/features/entry-control/__tests__/RevokeTokenModal.test.jsx` | `admin.entry.token.revoke` (not in catalog) | `body.textContent.length > 0` → smoke |
| `src/admin/features/entry-control/__tests__/EntryTokenModal.test.jsx` | `admin.entry.token.modal` (not in catalog) | `body.textContent.length > 0` → smoke |
| `src/admin/features/outcomes/components/__tests__/FrameworkSetupPanel.test.jsx` | `coverage.framework-setup-panel.no-periods` (not in catalog) | `container.firstChild.toBeTruthy()` → smoke |
| `src/admin/features/audit/__tests__/AuditEventDrawer.test.jsx` | `admin.audit.drawer.render` (not in catalog) | `body.textContent.length > 0` → smoke |
| `src/admin/features/criteria/__tests__/StarterCriteriaDrawer.test.jsx` | `admin.criteria.drawer.starter` (not in catalog) | `getByText("Active Criteria")` → static heading |
| `src/admin/features/jurors/__tests__/JurorReviewsModal.test.jsx` | `coverage.juror-reviews-modal.renders` (not in catalog) | `getByText("Juror Reviews")` → static heading |
| `src/admin/features/outcomes/__tests__/AddOutcomeDrawer.test.jsx` | `admin.outcomes.drawer.add` (not in catalog) | `getByText("Add Outcome")` → static heading |
| `src/admin/features/settings/__tests__/EditProfileDrawer.test.jsx` | `admin.settings.drawer.profile` (not in catalog) | `getByText("Edit Profile")` → static heading |

Note: All Step 1 IDs were absent from `qa-catalog.json` — no catalog surgery needed for these.

### Step 2 — "Also check" files (already deleted from disk before this session)

| File | IDs removed from catalog | Verdict |
|------|--------------------------|---------|
| `src/admin/features/analytics/__tests__/AnalyticsTab.test.jsx` | `coverage.analytics-tab.smoke` (not in catalog) | `typeof AnalyticsTab === 'function'` → pure smoke |
| `src/admin/features/rankings/__tests__/ScoresTab.test.jsx` | `coverage.scores-tab.renders-rankings` (not in catalog) | Mocked sub-page text → smoke |
| `src/admin/features/settings/__tests__/SettingsComponents.test.jsx` | `coverage.security-signal-pill.renders`, `coverage.user-avatar-menu.renders` (not in catalog) | MIXED: SecuritySignalPill has borderline state→text check; UserAvatarMenu is pure smoke. Aggressive strategy → delete. |

### Step 2 — New directories (deleted in this session)

| File | IDs removed from catalog | Verdict |
|------|--------------------------|---------|
| `src/admin/features/jurors/components/__tests__/JurorsFilterPanel.test.jsx` | `coverage.jurors-filter-panel.renders`, `coverage.jurors-filter-panel.close-button` | Both: heading text + `×` text → static |
| `src/admin/features/outcomes/components/__tests__/OutcomeRow.test.jsx` | `coverage.outcome-row.renders` | `getByText("Engineering Design")` (prop passthrough) → smoke |
| `src/admin/features/periods/components/__tests__/PeriodsFilterPanel.test.jsx` | `coverage.periods-filter-panel.renders`, `coverage.periods-filter-panel.close-button` | Both: heading text + `×` text → static |
| `src/admin/features/projects/components/__tests__/ProjectsFilterPanel.test.jsx` | `coverage.projects-filter-panel.renders`, `coverage.projects-filter-panel.close-button` | Both: heading text + `×` text → static |
| `src/admin/features/periods/__tests__/PeriodsModals.test.jsx` | `coverage.revert-to-draft-modal.renders`, `coverage.request-revert-modal.renders` | Both: static heading text only |
| `src/admin/features/pin-blocking/__tests__/PinModals.test.jsx` | `coverage.pin-reset-confirm-modal.renders`, `coverage.unlock-all-modal.renders` | Both: static heading text only |

**Catalog entries removed: 11** (1051 → 1040 entries)

---

## Files Scanned But Kept

| File | Reason |
|------|--------|
| `src/admin/features/criteria/components/__tests__/CriteriaFilterPanel.test.jsx` | MIXED: `getByRole("button", { name: /close filter panel/i })` is a real accessibility assertion |
| `src/admin/features/outcomes/components/__tests__/OutcomeModals.test.jsx` | MIXED: `DeleteOutcomeModal.confirm-disabled` checks button is disabled when confirmText='' → real behavior |
| `src/admin/features/periods/components/__tests__/PeriodSmallComponents.test.jsx` | MIXED: `readiness-popover.null-readiness` asserts `container.firstChild.toBeNull()` when prop is null → real null-return contract |
| `src/admin/features/organizations/__tests__/TenantSwitcher.test.jsx` | REAL: `hidden-single` asserts returns null for single tenant — conditional render behavior |
| `src/admin/features/criteria/__tests__/CoverageBar.test.jsx` | MIXED: `coverage-bar.empty` asserts null when bands=[] — conditional render contract |
| `src/admin/features/criteria/__tests__/PureCriteriaComponents.test.jsx` | REAL: All 3 tests check computed output (format, empty state, pill list) |
| `src/admin/features/heatmap/__tests__/HeatmapMobileList.test.jsx` | Per plan: empty state text = real contract |
| `src/admin/analytics/__tests__/captureChartImage.test.js` | Per plan: null element → null (edge case) |
| `src/admin/analytics/__tests__/captureSvgForPdf.test.js` | Per plan: null element → false (edge case) |
| `src/admin/utils/__tests__/exportXLSX.test.js` | Per plan: filename regex, pure logic |
| `src/admin/utils/__tests__/downloadTable.test.js` | Per plan: arrayBufferToBase64, pure logic |
| `src/admin/features/criteria/__tests__/CriteriaConfirmModals.test.jsx` | Per plan: disabled state behavior |

---

## Known Gaps (components with no remaining test file)

The following components lost their only test file and have no other test coverage:

| Component | Former test file |
|-----------|-----------------|
| `PinPolicyDrawer` | `src/admin/shared/__tests__/PinPolicyDrawer.test.jsx` |
| `ReviewMobileCard` | `src/admin/features/reviews/__tests__/ReviewMobileCard.test.jsx` |
| `RevokeTokenModal` | `src/admin/features/entry-control/__tests__/RevokeTokenModal.test.jsx` |
| `EntryTokenModal` | `src/admin/features/entry-control/__tests__/EntryTokenModal.test.jsx` |
| `FrameworkSetupPanel` | `src/admin/features/outcomes/components/__tests__/FrameworkSetupPanel.test.jsx` |
| `AuditEventDrawer` | `src/admin/features/audit/__tests__/AuditEventDrawer.test.jsx` |
| `StarterCriteriaDrawer` | `src/admin/features/criteria/__tests__/StarterCriteriaDrawer.test.jsx` |
| `JurorReviewsModal` | `src/admin/features/jurors/__tests__/JurorReviewsModal.test.jsx` |
| `AddOutcomeDrawer` | `src/admin/features/outcomes/__tests__/AddOutcomeDrawer.test.jsx` |
| `EditProfileDrawer` | `src/admin/features/settings/__tests__/EditProfileDrawer.test.jsx` |
| `AnalyticsTab` | `src/admin/features/analytics/__tests__/AnalyticsTab.test.jsx` |
| `ScoresTab` | `src/admin/features/rankings/__tests__/ScoresTab.test.jsx` |
| `SecuritySignalPill` | `src/admin/features/settings/__tests__/SettingsComponents.test.jsx` |
| `UserAvatarMenu` | `src/admin/features/settings/__tests__/SettingsComponents.test.jsx` |
| `JurorsFilterPanel` | `src/admin/features/jurors/components/__tests__/JurorsFilterPanel.test.jsx` |
| `OutcomeRow` | `src/admin/features/outcomes/components/__tests__/OutcomeRow.test.jsx` |
| `PeriodsFilterPanel` | `src/admin/features/periods/components/__tests__/PeriodsFilterPanel.test.jsx` |
| `ProjectsFilterPanel` | `src/admin/features/projects/components/__tests__/ProjectsFilterPanel.test.jsx` |
| `RevertToDraftModal` | `src/admin/features/periods/__tests__/PeriodsModals.test.jsx` |
| `RequestRevertModal` | `src/admin/features/periods/__tests__/PeriodsModals.test.jsx` |
| `PinResetConfirmModal` | `src/admin/features/pin-blocking/__tests__/PinModals.test.jsx` |
| `UnlockAllModal` | `src/admin/features/pin-blocking/__tests__/PinModals.test.jsx` |

These are candidates for real behavioral tests in a future E3/F-session.

---

## Final Test Run

```
Test Files  234 passed (234)
      Tests  913 passed (913)
   Start at  00:36:44
   Duration  11.84s
```

0 failures. 0 skipped.
