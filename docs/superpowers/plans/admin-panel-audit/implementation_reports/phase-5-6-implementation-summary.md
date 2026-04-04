# Phase 5-6 Implementation Summary

**Date:** 2026-04-04
**Branch:** `refactor/folder-restructure`
**Scope:** Window 4 — Phase 5 (PinBlockingPage backend wiring) + Phase 6 (Import CSV activation)

---

## Pre-Implementation State

- All Phase 4b work complete; 301/301 tests passing ✅
- `src/admin/pages/PinBlockingPage.jsx` — static shell only; showed incorrect "5 attempts" threshold; no props, no backend
- `src/admin/layout/AdminLayout.jsx` — rendered `<PinBlockingPage />` with no props
- `src/admin/modals/ImportCsvModal.jsx` + `ImportJurorsModal.jsx` — fully built, zero call sites
- `src/admin/pages/ProjectsPage.jsx` + `JurorsPage.jsx` — Import buttons rendered but no onClick
- No `listLockedJurors` / `unlockJurorPin` wrappers in the API layer
- papaparse not installed

---

## Phase 5: PinBlockingPage Implementation

### 5-A: API wrappers — `src/shared/api/admin/jurors.js`

Added two functions at the end of the file:

**`listLockedJurors({ periodId })`**

- Queries `juror_period_auth` joined to `jurors`, filtered by `locked_until.gt.now OR is_blocked=true`
- Maps DB snake_case → UI camelCase: `jurorId`, `jurorName`, `affiliation`, `isBlocked`, `failedAttempts`, `lockedUntil`, `lockedAt`
- Runtime guard: throws if `periodId` is missing (Rule 2)

**`unlockJurorPin({ jurorId, periodId })`**

- Calls `rpc_juror_unlock_pin(p_period_id, p_juror_id)`
- Checks `data?.error_code` and throws if present
- Runtime guard: throws if either param is missing (Rule 2)

Both functions were re-exported through `src/shared/api/admin/index.js` and `src/shared/api/index.js`.

### 5-B: Hook — `src/admin/hooks/usePinBlocking.js`

New hook: `usePinBlocking({ periodId })`

State: `lockedJurors`, `loading`, `error`

Handlers:

- `loadLockedJurors()` — fetches via `listLockedJurors({periodId})`, memoized by `periodId`
- `handleUnlock(jurorId)` — unlocks single juror, removes from local state, shows toast
- `handleUnlockAll()` — iterates all locked jurors, counts failures, shows aggregate toast

### 5-C: PinBlockingPage rewrite — `src/admin/pages/PinBlockingPage.jsx`

Complete rewrite. Key changes from the shell:

| Detail | Shell | Rewrite |
|--------|-------|---------|
| Props | none | `organizationId`, `selectedPeriodId` |
| Hook | none | `usePinBlocking({ periodId: selectedPeriodId })` |
| Fail threshold | ~~5~~ (incorrect) | **3** (DB value) |
| KPI: Currently Locked | static `—` | `lockedJurors.length` (red when > 0) |
| Locked jurors table | empty placeholder | real data with loading/empty states |
| Unlock button | disabled | calls `handleUnlock(j.jurorId)` |
| Unlock All button | disabled | calls `handleUnlockAll()`, disabled when empty |
| No period guard | missing | "Select an evaluation period" empty state (Rule 5) |
| Status badge | missing | inline-styled Blocked/Locked indicator |
| Policy Snapshot | 5 attempts | **3 attempts** |

`useEffect` loads jurors when `loadLockedJurors` changes (i.e. when `periodId` changes).

### 5-D: AdminLayout prop pass — `src/admin/layout/AdminLayout.jsx`

```jsx
// Before
<PinBlockingPage />

// After
<PinBlockingPage
  organizationId={activeOrganization?.id}
  selectedPeriodId={selectedPeriodId}
/>
```

---

## Phase 6: Import CSV Activation

### 6-A: Install papaparse

```bash
npm install papaparse
```

### 6-B: CSV parser — `src/admin/utils/csvParser.js`

Two exported functions:

**`parseProjectsCsv(file)`** → `{ rows, stats, warningMessage, file }`

- Columns resolved via flexible alias matching (`normalizeHeader` strips spaces/`#`/dashes)
- `PROJECT_COL_MAP`: `group_no`, `title`, `members`
- Row shape for modal: `{ rowNum, groupNo, title, members, status, statusLabel }`
- API fields included: `group_no` (integer or null)
- Validation: missing `group_no` or `title` → `status: "err"`

**`parseJurorsCsv(file)`** → `{ rows, stats, warningMessage, file }`

- `JUROR_COL_MAP`: `juror_name`, `affiliation`, `email`
- Row shape for modal: `{ rowNum, name, affiliation, status, statusLabel }`
- API fields included: `juror_name`, `email`
- Validation: missing name → `status: "err"`

Both functions return `warningMessage: { title, desc }` when expected columns are not found in the file.

### 6-C: ProjectsPage.jsx wiring

Added:

1. Imports: `ImportCsvModal`, `parseProjectsCsv`
2. State: `csvInputRef`, `importOpen`, `importFile`, `importRows`, `importStats`, `importWarning`, `importBusy`, `cancelImportRef`
3. Import button: `onClick={() => csvInputRef.current?.click()}`
4. Hidden `<input type="file" accept=".csv">` → `parseProjectsCsv` → open modal
5. `handleImport()` — filters valid rows, calls `projects.handleImportProjects(validRows, { cancelRef })`, shows success toast
6. `<ImportCsvModal>` rendered at bottom of component

### 6-D: JurorsPage.jsx wiring

Same pattern with `ImportJurorsModal` and `parseJurorsCsv`:

1. Imports: `ImportJurorsModal`, `parseJurorsCsv`
2. State: `csvInputRef`, `importOpen`, `importFile`, `importRows`, `importStats`, `importWarning`, `importBusy`
3. Import button: `onClick={() => csvInputRef.current?.click()}`
4. Hidden `<input type="file" accept=".csv">` → `parseJurorsCsv` → open modal
5. `handleImport()` — filters valid rows, calls `jurorsHook.handleImportJurors(validRows)`, shows success toast
6. `<ImportJurorsModal>` rendered at bottom of component

---

## Files Changed

| # | File | Change |
|---|------|--------|
| 1 | `src/shared/api/admin/jurors.js` | Added `listLockedJurors`, `unlockJurorPin` |
| 2 | `src/shared/api/admin/index.js` | Re-exported new juror functions |
| 3 | `src/shared/api/index.js` | Re-exported new juror functions |
| 4 | `src/admin/hooks/usePinBlocking.js` | NEW — PIN blocking hook |
| 5 | `src/admin/pages/PinBlockingPage.jsx` | Full rewrite with real backend wiring |
| 6 | `src/admin/layout/AdminLayout.jsx` | Pass `organizationId` + `selectedPeriodId` to PinBlockingPage |
| 7 | `src/admin/utils/csvParser.js` | NEW — `parseProjectsCsv` + `parseJurorsCsv` |
| 8 | `src/admin/pages/ProjectsPage.jsx` | Import button wired → modal |
| 9 | `src/admin/pages/JurorsPage.jsx` | Import button wired → modal |
| 10 | `package.json` / `package-lock.json` | Added papaparse dependency |

---

## Test Results

```text
Test Files  38 passed (38)
Tests      301 passed (301)
Duration   ~4.1s
```

All 301 tests pass with zero failures.

---

## Notes

### Fail threshold: 3, not 5

The original PinBlockingPage shell showed "5 failed attempts" — this was incorrect. The DB RPC `rpc_jury_verify_pin` uses `v_max_attempts := 3`. The rewrite corrects this in both the alert banner and Policy Snapshot. The threshold is hardcoded as a DB-defined constant (not configurable from UI), consistent with the existing lock duration (15m).

### organizationId not used directly

`organizationId` is accepted by `PinBlockingPage` but not forwarded to the hook. The `usePinBlocking` hook only needs `periodId` — the organization context is implicit because periods already belong to a specific organization. The prop is present in the signature for future use (e.g. cross-period view) and consistency with other pages.

### Import CSV: error rows are filtered before API call

`handleImport()` calls `.filter((r) => r.status === "ok")` before passing rows to the API hooks. This means rows with parse errors (missing required columns) are silently skipped — the modal's preview table already marks them red, so the user sees them before confirming.

---

## Next Window Preconditions

Window 5 (Phase 7-9: Export fixes + Settings cleanup + Final audit) can start immediately:

- All 301 tests passing ✅
- PinBlockingPage fully wired with real backend ✅
- Import CSV active in ProjectsPage + JurorsPage ✅
- No forbidden patterns introduced ✅
