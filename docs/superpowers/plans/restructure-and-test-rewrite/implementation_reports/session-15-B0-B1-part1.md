# Session 15 — B0 + B1 Part 1: Test Archive + Shared/Lib Tests

**Date:** 2026-04-23
**Model:** Sonnet 4.6 (~200k context)
**Scope:** S15 — Archive old tests, scaffold feature-aligned test structure, build test kit, write shared/lib tests

---

## Summary

Faz B started: all old tests archived, new feature-aligned `__tests__/` directories scaffolded, test kit built (fixtures + factories + helpers), and the first batch of shared/lib tests written and passing. **20 tests across 6 files, all green.** One bug found and fixed in `environment.js` (the `/demo-settings` false-positive).

---

## B0 — Archive + Scaffold

### Archives

All pre-existing test directories renamed via `git mv`:

| Source | Destination |
|---|---|
| `src/admin/__tests__/` | `src/admin/__tests__.archive/` |
| `src/auth/__tests__/` | `src/auth/__tests__.archive/` |
| `src/jury/__tests__/` | `src/jury/__tests__.archive/` |
| `src/shared/__tests__/` | `src/shared/__tests__.archive/` |
| `sql/__tests__/` | `sql/__tests__.archive/` |
| `src/test/qa-catalog.json` | `src/test/qa-catalog.archive.json` |
| `src/admin/shared/useDeleteConfirm.test.jsx` | `src/admin/shared/useDeleteConfirm.test.archive.jsx` |

The stray file `useDeleteConfirm.test.jsx` (placed directly in `admin/shared/`, outside any `__tests__/`) was discovered when it caused a test runner failure. Archived and added `**/*.archive.*` to the vitest exclude list.

### `vite.config.js` changes

- Added `'**/__tests__.archive/**'`, `'**/sql/__tests__.archive/**'`, `'**/*.archive.*'` to `test.exclude`
- Added `watchExclude` with archive patterns
- Added full `coverage` block:
  ```js
  coverage: {
    provider: 'v8',
    reporter: ['text', 'lcov', 'html'],
    include: ['src/**/*.{js,jsx,ts,tsx}'],
    exclude: ['src/test/**', 'src/**/__tests__.archive/**', 'src/main.jsx', 'src/router.jsx'],
    thresholds: { lines: 0, functions: 0, branches: 0, statements: 0 },
  }
  ```

### Feature `__tests__/` skeleton

`__tests__/` + `.gitkeep` created for every feature:
- 17 admin features (`overview` → `export`)
- `src/admin/shared/__tests__/`
- 9 jury features (`arrival` → `lock`) + `src/jury/shared/__tests__/`
- 9 auth features (`login` → `grace-lock`) + `src/auth/shared/__tests__/`
- `src/shared/__tests__/{api,ui,hooks,storage,lib}/`

### Test kit (`src/test/`)

**Fixtures** — static JSON seed data:
- `fixtures/organizations.json` — 2 orgs (pro + free)
- `fixtures/jurors.json` — 3 jurors (2 active, 1 inactive)
- `fixtures/periods.json` — 2 periods (1 active, 1 completed)
- `fixtures/projects.json` — 2 projects
- `fixtures/scores.json` — 3 scores

**Factories** — sequential ID generators with override support:
- `factories/buildOrg.js` — `buildOrg(overrides?)`
- `factories/buildJuror.js` — `buildJuror(overrides?)`
- `factories/buildPeriod.js` — `buildPeriod(overrides?)`
- `factories/buildProject.js` — `buildProject(overrides?)`
- `factories/buildScore.js` — `buildScore(overrides?)`
- `factories/buildUser.js` — `buildUser(overrides?)`
- `factories/index.js` — re-exports all

**Helpers**:
- `helpers/renderWithRouter.jsx` — `createMemoryRouter` + `RouterProvider`
- `helpers/renderWithAuth.jsx` — `AuthContext.Provider` + `MemoryRouter`
- `helpers/mockSupabase.js` — `makeMockSupabase({ data, error })` (from, rpc, auth stubs)
- `helpers/mockInvokeEdge.js` — `mockInvokeEdge({ result, error })` returns `vi.fn()`

---

## B1 Part 1 — shared/lib Tests

### `qa-catalog.json`

19 entries added for the shared/lib module:

| ID range | Module | Count |
|---|---|---|
| `lib.env.01–05` | environment.js | 5 |
| `lib.utils.01–02` | utils.js (cn) | 2 |
| `lib.date.01–05` | dateUtils.js | 5 |
| `lib.uuid.01–03` | randomUUID.js | 3 |
| `lib.demo.01–02` | demoMode.js | 2 |
| `lib.supabase.01–03` | supabaseClient.js | 3 |

### Bug fixed: `environment.js` `/demo-settings` false-positive

While writing `lib.env.05`, found that the original implementation using `startsWith("/demo")` classified `/demo-settings`, `/demo-export`, etc. as demo environment — incorrect.

**Before:**
```js
if (window.location.pathname.startsWith("/demo")) return "demo";
```

**After:**
```js
const p = window.location.pathname;
if (p === "/demo" || p.startsWith("/demo/")) return "demo";
```

### Tests written

All 6 test files in `src/shared/lib/__tests__/`:

| File | Tests | Key technique |
|---|---|---|
| `environment.test.js` | 5 | `global.window` stub, `vi.resetModules()`, dynamic `import()` |
| `utils.test.js` | 2 | Static import, `cn()` class merging |
| `dateUtils.test.js` | 5 | Null guards + ISO string formatting, no time in `formatDate` |
| `randomUUID.test.js` | 3 | `vi.stubGlobal("crypto", ...)`, fallback UUID regex, 100-sample uniqueness |
| `demoMode.test.js` | 2 | `global.window` stub, `vi.resetModules()`, module-level DEMO_MODE constant |
| `supabaseClient.test.js` | 3 | `vi.mock("@supabase/supabase-js", ...)`, Proxy forwarding, localStorage error resilience |

### Notable fixes during test run

1. **`expect is not defined`** in `environment.test.js` — `expect` missing from vitest import line. Fixed.
2. **`Cannot set property crypto`** in `randomUUID.test.js` — jsdom exposes `global.crypto` as a getter-only property; direct assignment throws. Fixed with `vi.stubGlobal("crypto", ...)` + `vi.unstubAllGlobals()` in afterEach.
3. **Stray test file** `src/admin/shared/useDeleteConfirm.test.jsx` — not in any `__tests__/` dir, so missed by the initial archive sweep. Discovered via failing test run, archived with `git mv`, added `**/*.archive.*` to vitest exclude.

### Final test run

```
Test Files  6 passed (6)
     Tests  20 passed (20)
  Start at  01:40:45
  Duration  902ms
```

---

## Files Created / Modified

| Action | Path |
|---|---|
| Modified | `vite.config.js` |
| Modified | `src/shared/lib/environment.js` (bug fix) |
| Created | `src/test/qa-catalog.json` (19 entries) |
| Archived | `src/test/qa-catalog.archive.json` |
| Created | `src/test/fixtures/organizations.json` |
| Created | `src/test/fixtures/jurors.json` |
| Created | `src/test/fixtures/periods.json` |
| Created | `src/test/fixtures/projects.json` |
| Created | `src/test/fixtures/scores.json` |
| Created | `src/test/factories/buildOrg.js` + buildJuror + buildPeriod + buildProject + buildScore + buildUser + index.js |
| Created | `src/test/helpers/renderWithRouter.jsx` + renderWithAuth.jsx + mockSupabase.js + mockInvokeEdge.js |
| Created | `src/shared/lib/__tests__/environment.test.js` |
| Created | `src/shared/lib/__tests__/utils.test.js` |
| Created | `src/shared/lib/__tests__/dateUtils.test.js` |
| Created | `src/shared/lib/__tests__/randomUUID.test.js` |
| Created | `src/shared/lib/__tests__/demoMode.test.js` |
| Created | `src/shared/lib/__tests__/supabaseClient.test.js` |
| Archived (git mv) | `src/admin/__tests__/` → `__tests__.archive/` |
| Archived (git mv) | `src/auth/__tests__/` → `__tests__.archive/` |
| Archived (git mv) | `src/jury/__tests__/` → `__tests__.archive/` |
| Archived (git mv) | `src/shared/__tests__/` → `__tests__.archive/` |
| Archived (git mv) | `sql/__tests__/` → `sql/__tests__.archive/` |
| Archived (git mv) | `src/admin/shared/useDeleteConfirm.test.jsx` → `.archive.jsx` |
| Created | 37 × `__tests__/.gitkeep` across feature dirs |

---

## Next Session (S16)

**B1 Part 2** — shared/api + shared/storage tests:
- `src/shared/api/fieldMapping.js`
- `src/shared/api/core/invokeEdgeFunction.js`
- `src/shared/api/juryApi.js`
- `src/shared/api/admin/*` (key modules)
- `src/shared/storage/keys.js`, `juryStorage.js`, `adminStorage.js`
