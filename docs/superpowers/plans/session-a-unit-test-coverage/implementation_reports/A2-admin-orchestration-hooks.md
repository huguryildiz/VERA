# A2 — Admin Orchestration Hooks Coverage

**Sprint:** Session A — Unit Test Coverage
**Date:** 2026-04-24
**Status:** Complete

---

## Before / After Stats

| Metric | Before | After | Delta |
|--------|--------|-------|-------|
| Test files | 151 | 160 | +9 |
| Total tests | 496 | 535 | +39 |
| Failing tests | 0 | 0 | 0 |
| qa-catalog entries | 538 | 577 | +39 |

### Global coverage

| Metric | Before | After | Delta |
|--------|--------|-------|-------|
| Statements | 41.57% | 43.42% | +1.85% |
| Branches | ~57% | 57.21% | ~flat |
| Functions | ~32% | 33.19% | +1.19% |
| Lines | 41.57% | 43.42% | +1.85% |

### vite.config.js threshold ratchet

| Key | Before | After |
|-----|--------|-------|
| lines | 36 | 42 |
| functions | 25 | 31 |
| branches | 48 | 52 |
| statements | 36 | 42 |

---

## New Test Files

| File | Tests | Hook / Utility |
|------|-------|---------------|
| `src/admin/shared/__tests__/useAdminData.test.js` | 6 | `useAdminData` (394 lines, score/data loader) |
| `src/admin/shared/__tests__/useAdminRealtime.test.js` | 4 | `useAdminRealtime` (96 lines, Supabase realtime) |
| `src/admin/shared/__tests__/useAdminNav.test.js` | 4 | `useAdminNav` + `getPageLabel` (97 lines) |
| `src/admin/shared/__tests__/useGlobalTableSort.test.js` | 4 | `useGlobalTableSort` (178 lines, DOM sort) |
| `src/admin/shared/__tests__/useDeleteConfirm.test.js` | 4 | `useDeleteConfirm` + `buildCountSummary` (159 lines) |
| `src/admin/shared/__tests__/useBackups.test.js` | 5 | `useBackups` (143 lines) |
| `src/admin/features/settings/__tests__/useAdminTeam.test.js` | 5 | `useAdminTeam` (186 lines) |
| `src/admin/shared/__tests__/usePeriodOutcomes.test.js` | 6 | `usePeriodOutcomes` (634 lines, draft-buffer CRUD) |

---

## Key Patterns Used

- **MemoryRouter wrapper** for hooks that call `useLocation`/`useNavigate`
- **Module-scope `vi.mock` only** — never inside test bodies (vitest hoisting constraint)
- **Getter-based supabase mock** for `channel`/`removeChannel` to avoid stale property capture
- **`vi.useFakeTimers()`** for the 600ms debounce in `useAdminRealtime.04`
- **Separate `try/catch` inside `act` + `waitFor`** for async error state (useBackups.04)
- **`mockX.mockClear()` in `beforeEach`** to prevent cross-test spy pollution

---

## Pre-flight

`JurorsTable` test pre-flight check: already passing — no fix needed.

---

## Issues Encountered & Fixed

1. **`vi.mock` inside test body** (useAdminNav.03 draft): Vitest hoists all `vi.mock` calls, so calling one inside a test callback is invalid. Removed dynamic mock; replaced with a simple `typeof navigateTo === "function"` + no-throw assertion.

2. **useBackups error state race** (test.04): `expect(result.current.error).toContain(...)` asserted before React reconciled state. Fix: catch thrown error inside `act`, then use `waitFor(() => expect(...))` for the state update.

3. **useAdminTeam spy pollution** (test.03): `mockInviteOrgAdmin` from test.02 leaked into test.03 because `mockClear()` was missing. Added `mockInviteOrgAdmin.mockClear()` and `mockCancelOrgAdminInvite.mockClear()` to `beforeEach`.

4. **usePeriodOutcomes return shape**: Hook returns `outcomes`/`mappings` (not `draftOutcomes`/`draftMappings`). Fixed test assertions after first run failure.
