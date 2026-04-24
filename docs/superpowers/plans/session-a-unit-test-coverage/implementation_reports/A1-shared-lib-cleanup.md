# A1 — Shared Lib Cleanup & Zero-Coverage Fill

**Sprint:** Session A — Unit Test Coverage  
**Date:** 2026-04-24  
**Status:** Complete

---

## Before / After Stats

| Metric | Before | After | Delta |
|--------|--------|-------|-------|
| Test files | 147 | 151 | +4 |
| Total tests | 472 | 496 | +24 |
| Failing tests | 6 | 0 | −6 |
| qa-catalog entries | 514 | 538 | +24 |

### Coverage changes (key files)

| File | Lines before | Lines after | Funcs before | Funcs after |
|------|-------------|-------------|--------------|-------------|
| `dateUtils.js` | 76.78% | 100% | 66.66% | 100% |
| `toastStore.js` | 96% | 100% | 84.21% | 90% |
| `adminSession.js` | 90.47% | 90.47% | 92.85% | 92.85% |
| `environment.js` | 100% | 100% | 100% | 100% |
| `demoMode.js` | 100% | 100% | 100% | 100% |
| `criteriaSchema.js` | 0% | 100% | 0% | 100% |
| `ThemeProvider.jsx` | 0% | 100% | 0% | 100% |

---

## Step 1 — Fix 6 Pre-Existing Failures

All 6 failing tests were regressions from feature work that outpaced the tests:

### 1a — `filterPipeline.test.js` (filter.pipe.01, filter.pipe.02)

**Root cause:** `buildProjectMetaMap` was updated to return a 3-field object `{ title, students, advisor }` but the tests only expected `{ title, students }`.

**Fix:** Added `advisor: ""` to every `toEqual` expectation in filter.pipe.01 and filter.pipe.02 (including the empty-project sentinel case).

### 1b — `Modal.test.jsx` (ui.Modal.02)

**Root cause:** `Modal.jsx` closes via `onMouseDown` on the overlay, not `onClick`. The test used `fireEvent.click(overlay)` which never triggered `onClose`.

**Fix:** Changed `fireEvent.click(overlay)` → `fireEvent.mouseDown(overlay)`.

### 1c — `projectHelpers.test.js` (project.helpers.01)

**Root cause:** `getProjectCell("title")` now prefixes `P${group_no} — ` when `group_no != null`. The test project had `group_no: 3`, so the expected value was wrong.

**Fix:** Updated expected string from `"Team Alpha"` → `"P3 — Team Alpha"`.

### 1d — `ReviewsPage.test.jsx` (admin.reviews.page.render)

**Root cause:** S36 added `computeHighDisagreement` and `computeOutlierReviews` to `reviewsKpiHelpers.js`, but the mock in ReviewsPage's test only mocked the three original functions. The component crashed on import because the two new functions were `undefined`.

**Fix:** Switched the mock to use `importOriginal` and spread actual exports, then override the five functions individually with `vi.fn(() => 0)`.

### 1e — `organizations.test.js` (api.admin.organizations.03)

**Root cause:** `createOrganization` calls `supabase.rpc()`, not a `from().insert()` chain. Test 03 set up `mockFrom` but the function never touches `mockFrom`. Additionally, `vi.clearAllMocks()` (used in `beforeEach`) only clears call counts — not mock implementations — so `mockRpc` retained the rejection from test 02.

**Fix:** Changed test 03 to call `mockRpc.mockResolvedValue({ data: created, error: null })` instead of setting up the `mockFrom` chain.

---

## Step 2 — New Tests for Zero-Coverage Files

Four new test files created, all using `qaTest()` with catalog-registered IDs:

### `src/shared/__tests__/adminSession.test.js` (6 tests: lib.adminSession.01–06)

Covers all five exports of `src/shared/lib/adminSession.js`:
- `parseUserAgent` — browser detection (Chrome, Edge, Opera, Firefox, Safari, Unknown)
- `parseUserAgent` — OS detection (Windows, Android, iOS, macOS, Linux, Unknown)
- `maskIpAddress` — IPv4 last-octet masking, IPv6 last-two-segment masking, invalid inputs
- `normalizeCountryCode` — uppercase coercion, invalid/non-alpha2 rejection
- `getAuthMethodLabelFromSession` — single provider, providers array, multi-provider join, fallbacks
- `getAdminDeviceId` — `dev_` prefix, in-memory cache stability

### `src/shared/__tests__/toastStore.test.js` (5+1 tests: lib.toastStore.01–06)

Tests the pub/sub store with `vi.resetModules()` + dynamic import in `beforeEach` to guarantee fresh module state per test. Uses `vi.useFakeTimers()` for deterministic dismiss timing:
- emit / subscribe / unsubscribe
- update merging
- dismiss two-phase (exiting → removal)
- getAll
- **lib.toastStore.06** (Step 3): `update()` with `{ persistent: false }` triggers auto-dismiss

### `src/shared/__tests__/criteriaSchema.test.js` (7 tests: schema.criteria.01–07)

Validates Zod schemas from `src/shared/schemas/criteriaSchema.js`:
- `rubricBandSchema` — valid band, optional `range`, string min/max, empty desc
- `rubricBandSchema` — missing/empty `level`, missing `min`
- `criterionTemplateSchema` — valid criterion, empty `outcomes`, empty `rubric`
- `criterionTemplateSchema` — max=0/101, empty key/label, non-integer max
- `criteriaTemplateSchema` — two criteria summing to 100 ✓
- `criteriaTemplateSchema` — two criteria summing to 80 → "total 100" error ✗
- `criteriaTemplateSchema` — empty array → "one criterion" error ✗

### `src/shared/__tests__/ThemeProvider.test.jsx` (3 tests: theme.provider.01–03)

Tests `ThemeProvider` + `useTheme` context via a `ThemeConsumer` helper component:
- Children render correctly
- `defaultTheme` prop propagates through context
- `setTheme("dark")` adds `.dark` to `<html>` and `.dark-mode` to `<body>`; `setTheme("light")` removes them

---

## Step 3 — Close Branch Gaps in Existing Lib Tests

Coverage audit results for `src/shared/lib/**`:

| File | Gap | Fix |
|------|-----|-----|
| `dateUtils.js` | `formatTime` valid path never called (lines 47–52); all three catch blocks uncovered | Added **lib.date.06** (valid `formatTime`) + **lib.date.07** (mock `toLocaleString` to throw → covers all catch blocks) |
| `toastStore.js` | `update()` with `persistent: false` branch (lines 33–34) uncovered | Added **lib.toastStore.06** in Step 2 test file |
| `environment.js` | 100% — no gaps |  |
| `demoMode.js` | 100% — no gaps |  |
| `adminSession.js` | Lines 9–10 (crypto fallback), 19–20 (localStorage hit), 28–31 (catch) still uncovered | Low-priority defensive paths; would require `vi.resetModules()` + localStorage pre-seeding; deferred to A2 |

`dateUtils.js` went from 66.66% functions (below the 70% per-directory threshold) to **100% all metrics** after lib.date.06 and lib.date.07.

---

## Step 4 — Threshold Bump

`vite.config.js` global thresholds updated:

| Metric | Old | New |
|--------|-----|-----|
| lines | 30 | 36 |
| functions | 20 | 25 |
| branches | 45 | 48 |
| statements | 30 | 36 |

Per-directory thresholds unchanged:
- `src/shared/hooks/**`: lines/functions/branches/statements 70/50/70/70
- `src/shared/storage/**`: 80/65/50/80
- `src/shared/lib/**`: 55/70/75/55

All 496 tests pass with no threshold violations after the bump.

---

## Open Items for A2

1. **adminSession.js uncovered paths** — `generateDeviceId()` crypto fallback (lines 9–10), localStorage-hit path (lines 19–20), and catch block (lines 28–31). Requires `vi.resetModules()` + localStorage pre-seeding in a restructured test.

2. **adminSession.js functions at 90%** — The remaining gap is the `inMemoryDeviceId`-null + localStorage-stored flow and the crypto-less `generateDeviceId` branch.

3. **toastStore.js functions at 90%** — Arrow functions inside `.map()` callbacks where the `id !== match` branch is never exercised (always one-toast lists in tests). Low priority.

4. **Schema coverage for other schemas** — `src/shared/schemas/` may have additional schema files not yet covered.
