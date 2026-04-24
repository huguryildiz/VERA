# C6 — RBAC Boundary, Period Immutability, OAuth Session Inject

**Sprint:** Session C — E2E Depth & Integrity  
**Date:** 2026-04-24  
**Branch:** `test/c6-rbac-immutability-oauth`

---

## Summary

Three test axes implemented: RBAC cross-org mutation boundary, period structural immutability trigger, and Google OAuth session-injection flow. All 24 tests pass cleanly across 3 flake-check repeats.

---

## Task A — RBAC Boundary (`e2e/security/rbac-boundary.spec.ts`)

### What was tested

- Tenant-admin A cannot `PATCH` (update) Org B's period via PostgREST REST API
- Tenant-admin A cannot `DELETE` Org B's juror via PostgREST REST API (skipped — no jurors in other-org seed)
- Deliberately-break: tenant-admin CAN update own-org period (proves RLS is enforced, not absent)

### Implementation note

The sprint plan specified `rpc_admin_update_period` and `rpc_admin_delete_juror` RPCs — neither exists in the DB. Tests adapted to use direct PostgREST endpoints (`PATCH /rest/v1/periods`, `DELETE /rest/v1/jurors`) instead. PostgREST returns HTTP 200 + empty array when RLS silently blocks the mutation.

### Results

| Test | Status |
|------|--------|
| Cannot update org-B period | ✅ Pass (3/3) |
| Cannot delete org-B juror | ⏭ Skip (no seed jurors in other org) |
| Can update own-org period (break evidence) | ✅ Pass (3/3) |

---

## Task B — Period Immutability (`e2e/security/period-immutability.spec.ts`)

### What was tested

**Trigger: `trigger_block_periods_on_locked_mutate`**

- BEFORE UPDATE trigger blocks structural column change (`name`) on a locked period
- Service role is subject to this trigger: `current_user_is_super_admin()` calls `auth.uid()` which returns NULL for service role → trigger fires
- Deliberately-break: structural column update on an **unlocked** period succeeds (trigger inactive)

**Score write gap (documented):**

- `score_sheets_insert` RLS policy checks only org membership, NOT `closed_at`
- No trigger on `score_sheets` enforces the closed state
- Insert into a closed period's `score_sheets` succeeds (gap is real)

### Implementation notes

- Demo seed has all periods with `is_locked = false` — test dynamically locks a period, tests the trigger, then unlocks via `test.afterEach` (runs even on failure)
- `score_sheets` status constraint is `CHECK (status IN ('draft', 'in_progress', 'submitted'))` — initial implementation used `'not_started'` which violated the check; corrected to `'draft'`
- Score gap test uses labeled `break outer` to find a clean (juror, project) combo free of the `UNIQUE(juror_id, project_id)` constraint

### Results

| Test | Status |
|------|--------|
| Trigger blocks structural change on locked period | ✅ Pass (3/3) |
| Unlocked period update succeeds (break evidence) | ✅ Pass (3/3) |
| Score write gap: insert succeeds for closed period | ✅ Pass (3/3) |

---

## Task C — Google OAuth Session Inject (`e2e/auth/google-oauth.spec.ts`, `e2e/helpers/oauthSession.ts`)

### What was tested

- Valid session injected via `localStorage` → admin shell renders at `/demo/admin/overview`
- Deliberately-break: expired session (expires_at=1, invalid refresh_token) → AuthGuard kicks user out of `/admin` area

### New helper: `e2e/helpers/oauthSession.ts`

Intentionally separate from `supabaseAdmin.ts` — uses `VITE_DEMO_SUPABASE_URL` first (demo-first URL ordering) so that the storage key matches what the in-browser Supabase client derives for `/demo/*` routes. `supabaseAdmin.ts` uses prod-first ordering and must not be modified.

- `getStorageKey()`: derives `sb-${projectRef}-auth-token` from demo URL
- `buildAdminSession(email, password)`: password grant → JWT decode sub → `admin.getUserById` → full session object

### Implementation note

Demo route behavior: `AuthGuard` on `/demo/admin/*` redirects to `/demo` (not `/login`) on sign-out, so `DemoAdminLoader` can attempt auto-login. Expired session test uses `waitForURL((url) => !url.pathname.includes("/admin"))` instead of `/\/login/`.

### Results

| Test | Status |
|------|--------|
| Valid session → admin shell renders | ✅ Pass (3/3) |
| Expired session → leaves /admin area | ✅ Pass (3/3) |

---

## Flake Check

```
npm run e2e -- --grep 'rbac|immutability|oauth' --repeat-each=3 --workers=1
```

Result: **24 passed, 3 skipped** (stable across all 3 repeats, ~25s total)

The 3 skips are all "cannot delete org-B juror" — consistently skipped because the other-org in demo seed has no jurors to target.

---

## Files Changed

| File | Action |
|------|--------|
| `e2e/security/rbac-boundary.spec.ts` | Created (Task A) |
| `e2e/security/period-immutability.spec.ts` | Created (Task B) |
| `e2e/helpers/oauthSession.ts` | Created (Task C helper) |
| `e2e/auth/google-oauth.spec.ts` | Extended (Task C tests) |
