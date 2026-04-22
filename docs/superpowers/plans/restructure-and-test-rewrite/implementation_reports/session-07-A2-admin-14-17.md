# Session 07 — A2.14–A2.17: pin-blocking + settings + setup-wizard + export

**Date:** 2026-04-22
**Commits:** `refactor(A2.14)` through `refactor(A2.17)` — 4 feature commits
**Branch:** main
**Build:** ✅ green after every commit

---

## Scope

Co-locate the final 4 admin features into `src/admin/features/<name>/`, completing **all 17 admin features** in Faz A2.

| Task | Feature | Commit |
|---|---|---|
| A2.14 | pin-blocking | `refactor(A2.14): co-locate pin-blocking feature to features/pin-blocking/` |
| A2.15 | settings | `refactor(A2.15): co-locate settings feature to features/settings/` |
| A2.16 | setup-wizard | `refactor(A2.16): co-locate setup-wizard feature to features/setup-wizard/` |
| A2.17 | export | `refactor(A2.17): co-locate export feature to features/export/` |

---

## Files Moved

### A2.14 — pin-blocking

| Old path | New path |
|---|---|
| `src/admin/pages/PinBlockingPage.jsx` | `src/admin/features/pin-blocking/PinBlockingPage.jsx` |
| `src/admin/modals/PinResetConfirmModal.jsx` | `src/admin/features/pin-blocking/PinResetConfirmModal.jsx` |
| `src/admin/modals/UnlockAllModal.jsx` | `src/admin/features/pin-blocking/UnlockAllModal.jsx` |
| `src/admin/modals/UnlockPinModal.jsx` | `src/admin/features/pin-blocking/UnlockPinModal.jsx` |
| `src/admin/hooks/usePinBlocking.js` | `src/admin/features/pin-blocking/usePinBlocking.js` |
| `src/styles/pages/pin-lock.css` | `src/admin/features/pin-blocking/PinBlockingPage.css` |

**Cross-feature decisions — moved to `admin/shared/`:**
- `PinPolicyDrawer.jsx` (`admin/drawers/` → `admin/shared/`) — used by SettingsPage + PinBlockingPage
- `PinResultModal.jsx` (`admin/modals/` → `admin/shared/`) — used by multiple features
- `ResetPinModal.jsx` (`admin/modals/` → `admin/shared/`) — used by multiple features

**Consumer updates:**
- `src/admin/features/jurors/JurorsPage.jsx` — PinPolicyDrawer import updated
- `src/admin/pages/SettingsPage.jsx` — PinPolicyDrawer import updated (still at old location at time of this commit, fixed in A2.15)

---

### A2.15 — settings

| Old path | New path |
|---|---|
| `src/admin/pages/SettingsPage.jsx` | `src/admin/features/settings/SettingsPage.jsx` |
| `src/admin/drawers/SecurityPolicyDrawer.jsx` | `src/admin/features/settings/SecurityPolicyDrawer.jsx` |
| `src/admin/drawers/EditProfileDrawer.jsx` | `src/admin/features/settings/EditProfileDrawer.jsx` |
| `src/admin/drawers/ChangePasswordDrawer.jsx` | `src/admin/features/settings/ChangePasswordDrawer.jsx` |
| `src/admin/modals/AvatarUploadModal.jsx` | `src/admin/features/settings/AvatarUploadModal.jsx` |
| `src/admin/modals/DisableAuthMethodModal.jsx` | `src/admin/features/settings/DisableAuthMethodModal.jsx` |
| `src/admin/components/UserAvatarMenu.jsx` | `src/admin/features/settings/UserAvatarMenu.jsx` |
| `src/admin/hooks/useProfileEdit.js` | `src/admin/features/settings/useProfileEdit.js` |
| `src/admin/settings/ManageOrganizationsPanel.jsx` | `src/admin/features/settings/ManageOrganizationsPanel.jsx` |
| `src/styles/pages/settings.css` | `src/admin/features/settings/SettingsPage.css` |

**Cross-feature decisions:**
- `JuryRevokeConfirmDialog.jsx` (`admin/settings/` → `admin/shared/`) — used by entry-control (JuryEntryControlPanel)
- `GovernanceDrawers.jsx` planned for `features/settings/` but grep confirmed **OrganizationsPage.jsx is its sole consumer** → placed in `features/organizations/` instead

**Import fixes in `SettingsPage.jsx`:**
- Added `import "./SettingsPage.css"`
- `../drawers/SecurityPolicyDrawer` → `./SecurityPolicyDrawer`
- `@/admin/shared/PinPolicyDrawer` (cross-feature — stays in shared/)
- `../drawers/EditProfileDrawer` → `./EditProfileDrawer`
- `../drawers/ChangePasswordDrawer` → `./ChangePasswordDrawer`
- `@/admin/shared/ViewSessionsDrawer` (cross-feature — stays in shared/)
- `@/admin/components/SecuritySignalPill` → `@/admin/components/SecuritySignalPill.jsx`
- `@/admin/utils/computeSecuritySignal` → `@/admin/utils/computeSecuritySignal.js`
- `@/admin/hooks/useAdminTeam` → `@/admin/hooks/useAdminTeam.js`

**Import fixes in co-located drawers/modals:**
- `SecurityPolicyDrawer`: `../modals/DisableAuthMethodModal` → `./DisableAuthMethodModal`
- `EditProfileDrawer`: `@/admin/modals/AvatarUploadModal` → `./AvatarUploadModal`
- `useProfileEdit.js`: `../../shared/api` → `@/shared/api`
- `ManageOrganizationsPanel`: `../components/LastActivity` → `@/admin/components/LastActivity`

**Import fixes in `GovernanceDrawers.jsx`** (moved to `features/organizations/`):
- `../../utils/exportXLSX` → `@/admin/utils/exportXLSX`
- `../../hooks/useAdminContext` → `@/admin/hooks/useAdminContext`

**Consumer updates:**
- `src/admin/__tests__/ManageOrganizationsPanel.test.jsx` — import path updated to `features/settings/ManageOrganizationsPanel`
- `src/admin/features/entry-control/EntryControlPage.jsx` — JuryRevokeConfirmDialog → `@/admin/shared/`
- `src/admin/features/entry-control/JuryEntryControlPanel.jsx` — JuryRevokeConfirmDialog → `@/admin/shared/`
- `src/admin/features/organizations/OrganizationsPage.jsx` — GovernanceDrawers import updated to co-located path

---

### A2.16 — setup-wizard (2377 lines CSS)

| Old path | New path |
|---|---|
| `src/admin/pages/SetupWizardPage.jsx` | `src/admin/features/setup-wizard/SetupWizardPage.jsx` |
| `src/admin/hooks/useSetupWizard.js` | `src/admin/features/setup-wizard/useSetupWizard.js` |
| `src/styles/pages/setup-wizard.css` | `src/admin/features/setup-wizard/SetupWizardPage.css` |

**CSS import chain discovery:** `setup-wizard.css` was **not** in `main.css`. It was imported directly by 3 page components:
- `SetupWizardPage.jsx` itself
- `src/admin/features/outcomes/OutcomesPage.jsx` — used wizard layout tokens (CompletionStrip, band colors)
- `src/admin/features/periods/PeriodsPage.jsx` — used CompletionStrip classes

After co-location, all three consumers needed their import paths updated:
- `SetupWizardPage`: `../../styles/pages/setup-wizard.css` → `./SetupWizardPage.css`
- `OutcomesPage`: `../../../styles/pages/setup-wizard.css` → `@/admin/features/setup-wizard/SetupWizardPage.css`
- `PeriodsPage`: `@/styles/pages/setup-wizard.css` → `@/admin/features/setup-wizard/SetupWizardPage.css`

**Import fixes in `SetupWizardPage.jsx`:**
- Added `import "./SetupWizardPage.css"` (replacing old path)
- `../../hooks/useAdminContext` → `@/admin/hooks/useAdminContext`
- `./useSetupWizard` (co-located — no change needed)
- `../../modals/ImportCsvModal` → `@/admin/modals/ImportCsvModal` (stays in modals/ — used by ProjectsPage too)
- `../../utils/csvParser` → `@/admin/utils/csvParser`
- `../../utils/auditUtils` → `@/admin/utils/auditUtils`

**Cross-feature check:** `ImportCsvModal` used by both `SetupWizardPage` and `ProjectsPage` → stays in `admin/modals/`.

---

### A2.17 — export

| Old path | New path |
|---|---|
| `src/admin/pages/ExportPage.jsx` | `src/admin/features/export/ExportPage.jsx` |
| `src/styles/pages/export.css` | `src/admin/features/export/ExportPage.css` |

**Note:** `ExportPage` has no route in `adminChildRoutes` in `src/router.jsx` — no router change was needed.

**Import fixes in `ExportPage.jsx`:**
- Added `import "./ExportPage.css"`
- `../../hooks/useAdminContext` → `@/admin/hooks/useAdminContext`
- Dynamic import on line 110: `import("../../shared/api")` → `import("@/shared/api")` *(see Patterns section)*

**`main.css` cleanup:** Removed the entire "Page styles" section (was already minimal — only `export.css` remained after previous sessions):

```diff
-/* Page styles */
-@import './pages/export.css';
```

---

## Router updates

```js
// src/router.jsx — lazy imports updated for A2.15–A2.16
const SetupWizardPage = lazy(() => import("@/admin/features/setup-wizard/SetupWizardPage"));
const SettingsPage    = lazy(() => import("@/admin/features/settings/SettingsPage"));
// ExportPage: no router entry exists — no update needed
// PinBlockingPage: already updated in A2.14 commit
```

## main.css

Removed across the 4 commits:

```diff
-@import './pages/pin-lock.css';
-@import './pages/settings.css';
-(setup-wizard.css was never in main.css — directly imported by pages)
-/* Page styles */
-@import './pages/export.css';
```

---

## Patterns & Gotchas

### GovernanceDrawers placement

The plan suggested placing `GovernanceDrawers.jsx` in `features/settings/`. Before moving, a grep confirmed:

```bash
grep -rn "GovernanceDrawers" src/
# Result: only OrganizationsPage.jsx imports it
```

Single consumer → co-located with its consumer in `features/organizations/`, not settings. Avoids a cross-feature import in the wrong direction.

### setup-wizard.css not in main.css chain

Unlike all other page CSS files that were imported via `src/styles/main.css`, `setup-wizard.css` was imported directly by page components. After `git mv`, the old paths became invalid in 3 places — static analysis of `main.css` alone would have missed this.

**Pattern:** After moving any CSS file, run:
```bash
grep -rn "setup-wizard\|<css-filename>" src/
```
to find all consumers, not just `main.css`.

### Dynamic import depth trap (repeat pattern)

`ExportPage.jsx` had a dynamic import inside `handleExportProjects`:

```js
// Wrong depth from src/admin/features/export/ExportPage.jsx
const { adminListProjects } = await import("../../shared/api");
// ❌ resolves to src/admin/shared/api (doesn't exist)

// Fixed:
const { adminListProjects } = await import("@/shared/api");
// ✅ resolves to src/shared/api
```

Same trap as session 06 (AnalyticsPage). Dynamic `import()` calls inside function bodies are not caught by static import scanning. **Always run** `grep -n "import(" <moved-file>` after every feature move.

### Settings: multiple co-located drawers + modals

Settings was the most interconnected feature — 9 files moved, several with cross-imports. Import chain:

```
SettingsPage → SecurityPolicyDrawer → DisableAuthMethodModal
SettingsPage → EditProfileDrawer → AvatarUploadModal
SettingsPage → ChangePasswordDrawer
SettingsPage → PinPolicyDrawer (admin/shared/)
SettingsPage → ViewSessionsDrawer (admin/shared/)
```

Inner drawers/modals that reference each other must be resolved before the page itself compiles.

---

## Test impact

No new tests written (Tests phase is B4 — future sessions). One existing test had its import path updated:

- `src/admin/__tests__/ManageOrganizationsPanel.test.jsx` — import updated from `../settings/ManageOrganizationsPanel` to `../features/settings/ManageOrganizationsPanel`

Pre-existing fail count unchanged.

---

## State after session

- **17 / 17 admin features co-located** — Faz A2 complete
- `src/admin/pages/` — empty (all page files moved)
- `src/styles/pages/` — empty (all page CSS files moved)
- `src/admin/shared/` — contains: `AdminTeamCard`, `ManageBackupsDrawer`, `ViewSessionsDrawer`, `JurorBadge`, `JurorStatusPill`, `ImportJurorsModal`, `JurorHeatmapCard`, `usePeriodOutcomes`, `OutcomeEditor`, `PinPolicyDrawer`, `PinResultModal`, `ResetPinModal`, `JuryRevokeConfirmDialog`
- **Next session (8):** A3 — jury restructure (9 features + jury/shared, jury.css 4021 lines)
