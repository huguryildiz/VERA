# VERA Folder Restructure Plan

## Context

The VERA project has grown organically across 16 UI migration phases + a DB migration. The result: auth logic scattered across 3 directories, `shared/` acting as a catch-all, `components/` holding orphaned files, the admin root overloaded with 25 mixed-purpose files, and thin directories (`pages/` with 1 file, `hooks/` with 2). This restructure consolidates by feature, eliminates scatter, and establishes a clean, maintainable hierarchy.

**Non-goals:** CSS restructure (separate project), file content changes, new features.

## Target Structure

```text
src/
├── App.jsx, main.jsx, config.js          ← keep at root (Vite convention)
│
├── admin/                                 ← consolidated admin feature
│   ├── pages/          (18 files)         ← ALL page components here
│   ├── components/     (8 files)          ← admin-specific UI components
│   ├── hooks/          (19 files)         ← ALL admin hooks here
│   ├── drawers/        (16)               ← unchanged
│   ├── modals/         (9)                ← unchanged
│   ├── layout/         (3)                ← unchanged
│   ├── criteria/       (7)                ← unchanged
│   ├── selectors/      (6)               ← unchanged (merge projects/ here)
│   ├── analytics/      (2)                ← unchanged
│   ├── settings/       (3)                ← unchanged
│   ├── utils/          (5 files)          ← scoreHelpers, persist, utils, exportXLSX, projectHelpers
│   └── __tests__/      (23+)
│
├── jury/                                  ← unchanged internal structure
│   ├── JuryFlow.jsx, JuryGatePage.jsx, useJuryState.js
│   ├── hooks/, steps/, utils/, __tests__/
│
├── auth/                                  ← CONSOLIDATED: screens + provider + components
│   ├── screens/        (6 files)          ← LoginScreen, RegisterScreen, ...
│   ├── components/     (1 file)           ← TenantSearchDropdown
│   ├── AuthProvider.jsx, useAuth.js       ← moved from shared/auth/
│   └── index.js                           ← barrel: re-export AuthProvider, useAuth
│
├── landing/                               ← LandingPage + showcase carousel
│   ├── LandingPage.jsx
│   └── components/AdminShowcaseCarousel.jsx
│
├── shared/
│   ├── api/            (24)               ← unchanged (well structured)
│   ├── ui/             (10+ files)        ← Icons, Modal, Drawer, ConfirmDialog, Tooltip, etc.
│   ├── hooks/          (3 files)          ← use-mobile, use-pagination, useToast
│   ├── lib/            (3 files)          ← supabaseClient, demoMode, utils
│   ├── storage/        (5)                ← unchanged
│   ├── criteria/       (4)                ← unchanged
│   ├── schemas/        (1)                ← unchanged
│   ├── theme/          (1)                ← unchanged
│   ├── types/          (4 files)          ← moved from src/types/
│   └── __tests__/      (9+)
│
├── charts/             (14)               ← unchanged
├── assets/             (23)               ← unchanged
├── styles/             (29)               ← unchanged (CSS restructure is separate)
└── test/               (3 files)          ← utilities only: setup.js, qaTest.js, qa-catalog.json
```

**Root-level cleanup:**

- `vera_logo_white.png` → delete (duplicate of `src/assets/vera_logo_white.png`)
- `update_generator.js` → move to `scripts/`
- `todo.md` → move to `docs/` or delete if stale
- `src/components/ContactForm.jsx` → delete (0 imports, unused)
- `src/AdminPanel.jsx` → move to `admin/pages/` (it's a page wrapper)

**Directories removed:**

- `src/components/` (contents distributed to features + shared)
- `src/pages/` (LandingPage → landing/)
- `src/hooks/` (→ shared/hooks/)
- `src/lib/` (→ shared/lib/)
- `src/types/` (→ shared/types/)
- `src/shared/auth/` (→ auth/)

## Import Strategy

All moved files will use `@/` alias imports (already configured in jsconfig.json + vite.config.js).

Example: After moving `shared/auth/AuthProvider.jsx` → `auth/AuthProvider.jsx`:

- Old: `import { useAuth } from "../../shared/auth"`
- New: `import { useAuth } from "@/auth"`

This eliminates fragile deep-relative paths (`../../..`) and makes future moves trivial.

## Phases

Each phase = 1 git commit. Run `npm run dev` + `npm test -- --run` after each.

---

### Phase 0: Prep (branch + baseline)

```bash
git checkout -b refactor/folder-restructure
npm run dev    # verify baseline works
npm test -- --run  # verify tests pass
```

---

### Phase 1: Root cleanup + thin directory elimination

**Moves:**

| From | To | Reason |
|---|---|---|
| `src/hooks/use-mobile.js` | `src/shared/hooks/use-mobile.js` | Thin dir → shared |
| `src/hooks/use-pagination.js` | `src/shared/hooks/use-pagination.js` | Thin dir → shared |
| `src/components/toast/useToast.js` | `src/shared/hooks/useToast.js` | Cross-feature hook → shared |
| `src/types/*.d.ts` (4 files) | `src/shared/types/*.d.ts` | Consolidate |
| `src/lib/supabaseClient.js` | `src/shared/lib/supabaseClient.js` | Merge lib → shared/lib |
| `src/lib/demoMode.js` | `src/shared/lib/demoMode.js` | Merge lib → shared/lib |
| `src/lib/utils.js` | `src/shared/lib/utils.js` | Merge lib → shared/lib |

**Delete:**

- `src/hooks/` directory (empty after moves)
- `src/components/toast/` directory (empty after move)
- `src/types/` directory (empty after moves)
- `src/lib/` directory (empty after moves)

**Import updates:**

- `useToast`: 12 files import from `../../components/toast/useToast` or similar → `@/shared/hooks/useToast`
- `use-mobile`: grep for consumers, update
- `use-pagination`: grep for consumers, update
- `lib/supabaseClient`: 6+ files → `@/shared/lib/supabaseClient`
- `lib/demoMode`: 8+ files → `@/shared/lib/demoMode`
- `lib/utils` (cn): 9 files → `@/shared/lib/utils`
- types: check if any files import from `src/types/` path
- Update `src/shared/api/core/client.js` re-export path

**Estimated import changes:** ~45-50

**Files to check/update:**

- `src/shared/api/core/client.js` — re-exports supabaseClient
- `src/shared/auth/AuthProvider.jsx` — imports supabaseClient + demoMode
- `src/admin/layout/AdminLayout.jsx` — imports demoMode
- `src/admin/SettingsPage.jsx` — imports demoMode
- `src/admin/components/UserAvatarMenu.jsx` — imports demoMode
- `src/App.jsx` — imports demoMode
- `src/jury/hooks/useJuryWorkflow.js` — imports demoMode
- `src/jury/hooks/useJurorIdentity.js` — imports demoMode
- `src/jury/hooks/useJurySessionHandlers.js` — imports demoMode
- `src/jury/hooks/useJuryLoading.js` — imports demoMode
- All 12 useToast consumers (jury + admin)
- All 9 cn/utils consumers

---

### Phase 2: Auth consolidation

**Moves:**

| From | To | Reason |
|---|---|---|
| `src/auth/LoginScreen.jsx` | `src/auth/screens/LoginScreen.jsx` | Organize screens |
| `src/auth/RegisterScreen.jsx` | `src/auth/screens/RegisterScreen.jsx` | Organize screens |
| `src/auth/ForgotPasswordScreen.jsx` | `src/auth/screens/ForgotPasswordScreen.jsx` | Organize screens |
| `src/auth/ResetPasswordScreen.jsx` | `src/auth/screens/ResetPasswordScreen.jsx` | Organize screens |
| `src/auth/CompleteProfileScreen.jsx` | `src/auth/screens/CompleteProfileScreen.jsx` | Organize screens |
| `src/auth/PendingReviewScreen.jsx` | `src/auth/screens/PendingReviewScreen.jsx` | Organize screens |
| `src/shared/auth/AuthProvider.jsx` | `src/auth/AuthProvider.jsx` | Consolidate auth |
| `src/shared/auth/useAuth.js` | `src/auth/useAuth.js` | Consolidate auth |
| `src/shared/auth/index.js` | `src/auth/index.js` | Update barrel |
| `src/components/auth/TenantSearchDropdown.jsx` | `src/auth/components/TenantSearchDropdown.jsx` | Consolidate auth |

**Delete:**

- `src/shared/auth/` directory (empty after moves)
- `src/components/auth/` directory (empty after move)

**Import updates:**

- `useAuth` / `AuthProvider`: ~10 files import from `shared/auth` → `@/auth`
- `src/main.jsx` — `import { AuthProvider } from "./shared/auth"` → `"@/auth"`
- `src/admin/layout/AdminLayout.jsx` — lazy imports from `../../auth/LoginScreen` → `@/auth/screens/LoginScreen`
- `src/auth/screens/CompleteProfileScreen.jsx` — imports TenantSearchDropdown (now sibling)
- Update `src/auth/index.js` barrel to point to new local paths

**Estimated import changes:** ~18-20

---

### Phase 3: shared/ UI reorganization

**Create `src/shared/ui/` and move shared UI components:**

| From | To |
|---|---|
| `src/shared/Icons.jsx` | `src/shared/ui/Icons.jsx` |
| `src/shared/Modal.jsx` | `src/shared/ui/Modal.jsx` |
| `src/shared/Drawer.jsx` | `src/shared/ui/Drawer.jsx` |
| `src/shared/ConfirmDialog.jsx` | `src/shared/ui/ConfirmDialog.jsx` |
| `src/shared/ConfirmModal.jsx` | `src/shared/ui/ConfirmModal.jsx` |
| `src/shared/Tooltip.jsx` | `src/shared/ui/Tooltip.jsx` |
| `src/shared/AlertCard.jsx` | `src/shared/ui/AlertCard.jsx` |
| `src/shared/LevelPill.jsx` | `src/shared/ui/LevelPill.jsx` |
| `src/shared/ErrorBoundary.jsx` | `src/shared/ui/ErrorBoundary.jsx` |
| `src/shared/AutoGrow.jsx` | `src/shared/ui/AutoGrow.jsx` |
| `src/shared/CollapsibleEditorItem.jsx` | `src/shared/ui/CollapsibleEditorItem.jsx` |
| `src/shared/MinimalLoaderOverlay.jsx` | `src/shared/ui/MinimalLoaderOverlay.jsx` |
| `src/shared/BlockingValidationAlert.jsx` | `src/shared/ui/BlockingValidationAlert.jsx` |
| `src/shared/EntityMeta.jsx` | `src/shared/ui/EntityMeta.jsx` |

Also move: `src/components/EntityMeta.jsx` — check if duplicate of `src/shared/EntityMeta.jsx`, delete if so.

**Create `src/shared/ui/index.js`** barrel export for all UI components.

**Import updates:**

- Icons.jsx: 12+ consumers → `@/shared/ui/Icons`
- Modal.jsx: 9 consumers → `@/shared/ui/Modal`
- Drawer.jsx: 16 consumers → `@/shared/ui/Drawer`
- ConfirmDialog.jsx: 2 consumers
- Tooltip.jsx: 5 consumers
- AlertCard.jsx: 6 consumers
- ErrorBoundary.jsx: ~2 consumers
- Other components: 1-3 consumers each

**Estimated import changes:** ~60-65

---

### Phase 4: Admin root cleanup

**Move pages from admin root → admin/pages/:**

| From | To |
|---|---|
| `src/admin/OverviewPage.jsx` | `src/admin/pages/OverviewPage.jsx` |
| `src/admin/RankingsPage.jsx` | `src/admin/pages/RankingsPage.jsx` |
| `src/admin/AnalyticsPage.jsx` | `src/admin/pages/AnalyticsPage.jsx` |
| `src/admin/HeatmapPage.jsx` | `src/admin/pages/HeatmapPage.jsx` |
| `src/admin/ReviewsPage.jsx` | `src/admin/pages/ReviewsPage.jsx` |
| `src/admin/EntryControlPage.jsx` | `src/admin/pages/EntryControlPage.jsx` |
| `src/admin/PinBlockingPage.jsx` | `src/admin/pages/PinBlockingPage.jsx` |
| `src/admin/AuditLogPage.jsx` | `src/admin/pages/AuditLogPage.jsx` |
| `src/admin/SettingsPage.jsx` | `src/admin/pages/SettingsPage.jsx` |
| `src/admin/ExportPage.jsx` | `src/admin/pages/ExportPage.jsx` |
| `src/admin/ScoresTab.jsx` | `src/admin/pages/ScoresTab.jsx` |
| `src/admin/AnalyticsTab.jsx` | `src/admin/pages/AnalyticsTab.jsx` |
| `src/AdminPanel.jsx` | `src/admin/pages/AdminPanel.jsx` |

**Move hooks from admin root → admin/hooks/:**

| From | To |
|---|---|
| `src/admin/useGridExport.js` | `src/admin/hooks/useGridExport.js` |
| `src/admin/useGridSort.js` | `src/admin/hooks/useGridSort.js` |
| `src/admin/useHeatmapData.js` | `src/admin/hooks/useHeatmapData.js` |
| `src/admin/useScrollSync.js` | `src/admin/hooks/useScrollSync.js` |

**Move components from admin root → admin/components/:**

| From | To |
|---|---|
| `src/admin/JurorActivity.jsx` | `src/admin/components/JurorActivity.jsx` |
| `src/admin/LastActivity.jsx` | `src/admin/components/LastActivity.jsx` |
| `src/admin/CompletionStrip.jsx` | `src/admin/components/CompletionStrip.jsx` |
| `src/admin/MudekManager.jsx` | `src/admin/components/MudekManager.jsx` |
| `src/admin/CriteriaManager.jsx` | `src/admin/components/CriteriaManager.jsx` |
| `src/admin/components.jsx` | `src/admin/components/index.jsx` |
| `src/components/admin/DangerIconButton.jsx` | `src/admin/components/DangerIconButton.jsx` |

**Move utils from admin root → admin/utils/:**

| From | To |
|---|---|
| `src/admin/scoreHelpers.js` | `src/admin/utils/scoreHelpers.js` |
| `src/admin/persist.js` | `src/admin/utils/persist.js` |
| `src/admin/utils.js` | `src/admin/utils/adminUtils.js` (rename to avoid conflict) |
| `src/admin/xlsx/exportXLSX.js` | `src/admin/utils/exportXLSX.js` |
| `src/admin/projects/projectHelpers.js` | `src/admin/utils/projectHelpers.js` |

**Delete after moves:**

- `src/admin/xlsx/` directory
- `src/admin/projects/` directory
- `src/components/admin/` directory

**Import updates:**

- `AdminLayout.jsx` imports 12+ pages from `../OverviewPage` → `../pages/OverviewPage`
- All pages that import hooks/utils from sibling path → adjust
- Test files in `admin/__tests__/` that import from `../scoreHelpers` → `../utils/scoreHelpers`
- DangerIconButton consumers (3 files): update path

**Estimated import changes:** ~50-60

---

### Phase 5: Landing page + orphan cleanup

**Moves:**

| From | To |
|---|---|
| `src/pages/LandingPage.jsx` | `src/landing/LandingPage.jsx` |
| `src/components/home/AdminShowcaseCarousel.jsx` | `src/landing/components/AdminShowcaseCarousel.jsx` |
| `src/components/DemoAdminLoader.jsx` | `src/shared/ui/DemoAdminLoader.jsx` |

**Delete:**

- `src/pages/` directory
- `src/components/home/` directory
- `src/components/ContactForm.jsx` (unused, 0 imports)
- `src/components/` directory (should be empty now)

**Root file cleanup:**

| From | To |
|---|---|
| `update_generator.js` | `scripts/update_generator.js` |
| `todo.md` | `docs/todo.md` (or delete) |
| `vera_logo_white.png` | delete (exists in `src/assets/`) |

**Import updates:**

- `src/App.jsx` — lazy import of LandingPage: `"./pages/LandingPage"` → `"./landing/LandingPage"`
- `src/App.jsx` — DemoAdminLoader: `"./components/DemoAdminLoader"` → `"@/shared/ui/DemoAdminLoader"`
- `src/landing/LandingPage.jsx` — AdminShowcaseCarousel: update relative path

**Estimated import changes:** ~5-8

---

### Phase 6: Test file cleanup

**Moves:**

| From | To | Reason |
|---|---|---|
| `src/test/a11y.test.jsx` | `src/shared/__tests__/a11y.test.jsx` | Actual test → colocate |
| `src/test/scoreHelpers.test.js` | `src/admin/__tests__/scoreHelpers.test.js` | Already exists? check for dup |
| `src/test/utils.test.js` | `src/shared/__tests__/utils.test.js` | Actual test → colocate |
| `src/__tests__/App.storage.test.jsx` | `src/shared/__tests__/App.storage.test.jsx` | Root test → shared |

**Keep in `src/test/`** (utilities, not tests):

- `setup.js` — vitest setup file (referenced by vite.config.js)
- `qaTest.js` — test helper (imported by 24+ test files)
- `qa-catalog.json` — test catalog

**Import updates for moved tests:** Update relative paths to qaTest, supabaseClient mock, etc.

**Estimated import changes:** ~8-10

---

## Verification

After each phase:

1. `npm run dev` — app loads, navigate all pages
2. `npm test -- --run` — all unit tests pass
3. `npm run build` — production build succeeds

After all phases:

4. `npm run e2e` — E2E tests pass (if currently working)
5. Manual smoke test: landing → jury flow → admin login → all admin tabs

## Total Estimated Import Changes

| Phase | Changes |
|---|---|
| Phase 1: Thin dirs + lib merge | ~45-50 |
| Phase 2: Auth consolidation | ~18-20 |
| Phase 3: shared/ UI | ~60-65 |
| Phase 4: Admin root | ~50-60 |
| Phase 5: Landing + orphans | ~5-8 |
| Phase 6: Test cleanup | ~8-10 |
| **Total** | **~190-215** |

## Execution Strategy

- Use `git mv` for all moves (preserves history)
- After each `git mv`, use `grep -r` to find all imports of the old path
- Replace with `@/` alias form
- Each phase is one atomic commit — easy revert with `git revert`
- Branch: `refactor/folder-restructure`

## Files NOT Moved (intentional)

- `src/App.jsx`, `src/main.jsx`, `src/config.js` — stay at src/ root (Vite convention, index.html references main.jsx)
- `src/charts/` — already well-organized, shared across features
- `src/styles/` — CSS restructure is a separate effort
- `src/assets/` — no reason to move
- `sql/`, `supabase/`, `e2e/`, `scripts/`, `docs/` — root-level dirs stay
