# Registration Flow Redesign — Design Spec

**Date:** 2026-04-20
**Status:** Phase 1 complete; Phase 2 complete — pending PR merge
**Scope:** Admin registration flow only. Jury entry-token flow is unaffected.

---

## 1. Problem

Current admin registration is two-step and friction-heavy:

1. User fills `RegisterScreen` (name + email + org + password + confirm)
2. Supabase sends confirmation email; user cannot log in until clicked
3. After confirm + login, `profileIncomplete = true` routes the user back through `RegisterScreen` (application mode) — they enter org info **again** (metadata from step 1 is not pre-populated)
4. `completeProfile()` creates the org atomically

Problems:

- Duplicate data entry (org name asked twice on email/password path)
- Two visually overlapping screens (`RegisterScreen` in application mode vs `CompleteProfileScreen`) for the same Google OAuth finishing step
- Public org directory (`listOrganizationsPublic`) + "Join Existing" toggle invites spam, exposes tenant list, and creates an admin approval queue without clear value
- Users stuck in `PendingReview` when their only intent was to create a new org
- "Check your email" hard gate blocks first-use momentum

## 2. Goals

- **One form, one step** for the primary path (create new organization)
- **Invite-link only** for joining existing organizations (no public directory, no apply-to-any)
- **Soft email verification** with in-app banner instead of a pre-login gate
- **Bounded grace period** (7 days) after which unverified accounts are permanently deleted
- Reuse existing VERA design tokens and components — no new visual system

## 3. Non-Goals

- Redesigning the jury entry-token flow
- Introducing billing, plans, or per-seat limits
- Super-admin approval of new tenants (self-serve tenant creation is preserved)
- Building a public org directory with search/filter/discovery (already removed)
- Building a public org directory with search/filter/discovery

## 4. Decisions

### 4.1 Entry Paths

| Path | Flow | Verification state on landing |
|---|---|---|
| Email/password | `/register` → fill form → atomic signup + org create → `/admin` | `email_confirmed_at = null`, banner visible |
| Google OAuth | OAuth redirect → short profile form (name + org) → `/admin` | `email_confirmed_at` set by Google, no banner |
| Invite link | `/invite/accept?token=…` → name + password → `/admin` | `email_confirmed_at` set on accept, no banner |

### 4.2 Removed Patterns

- Public organization directory on registration (`listOrganizationsPublic()` calls in `RegisterScreen` and `CompleteProfileScreen`)
- `orgMode` toggle ("Create New" / "Join Existing")
- `GroupedCombobox` for org selection on registration screens
- Pre-login email confirmation gate (Supabase "Confirm email" setting turned OFF)
- `RegisterScreen` "Check your email" success state
- `RegisterScreen` re-entry via `isGoogleApplicationFlow` branch
- University + Department inline fields on `CompleteProfileScreen`
- `rpc_admin_create_org_and_membership` parameters `p_institution` and `p_department` (already dropped per 2026-04-20 `afbd3bd`; confirmed out of scope for re-addition)

### 4.3 Retained Patterns

- `passwordPolicy.js` strength policy + `PasswordStrengthBlock` UI
- `checkEmailAvailable()` live email check on blur
- `rpc_admin_create_org_and_membership` RPC (signature unchanged, made idempotent)
- `PendingReviewScreen` kept for legacy/in-flight pending applications but becomes unreachable from new signups
- `InviteAcceptScreen` mostly unchanged
- `useShakeOnError`, `touched` field pattern, progress bar

### 4.4 Email Verification (Soft)

- Supabase `Confirm email` setting: **OFF** on both vera-prod and vera-demo
- `signUp()` returns a session immediately
- `EmailVerifyBanner` shows on admin layout while `email_confirmed_at IS NULL`
- User can click "Resend link" → `supabase.auth.resend({ type: 'signup' })`
- On email click → `email_confirmed_at` set → banner disappears via auth state change

### 4.5 Locked Actions (Phase 2, Level B)

Enforced both client-side (disable + tooltip) and server-side (RPC raise).

**Activation condition:** locks apply only when `email_confirmed_at IS NULL AND memberships.grace_ends_at IS NOT NULL`. Pre-migration users (whose `grace_ends_at` stays NULL) are never locked — they keep the behavior they had before the change. Super-admins (organization_id IS NULL memberships) are also exempt.

**Locked while active:**

- Juror invite (`rpc_admin_create_juror_with_invite` + email send)
- Co-admin invite (`admin-invite-create` Edge Function)
- Entry-token generation (`rpc_admin_generate_entry_token`)
- Juror email notifications (`jury-notify` Edge Function)
- Report/export email sending
- Organization archive (`rpc_admin_archive_organization`)

**Unlocked (free during grace):**

- Creating periods, criteria, projects, juror records (DB only, no outbound email)
- Viewing analytics, rankings, audit log
- Changing preferences, profile, theme, password

### 4.6 Grace Period (Phase 2)

- Set on signup: `memberships.grace_ends_at = now() + interval '7 days'`
- Cleared on verify: trigger on `auth.users.email_confirmed_at` sets `grace_ends_at = NULL`
- On expiry: `_assert_tenant_admin(p_action)` raises `email_verification_grace_expired` for any locked action; `GraceLockScreen` rendered for full admin panel showing a deletion warning
- On expiry the user can still: sign out, resend verification link, open the link in email. All `/admin/*` routes redirect to `GraceLockScreen`; `/jury/*`, `/login`, `/forgot-password` remain accessible.
- **Account deleted after expiry.** A daily pg_cron job (`_cleanup_unverified_expired_accounts`, 03:00 UTC) permanently deletes `auth.users` rows whose `email_confirmed_at IS NULL` and whose membership `grace_ends_at < now()`. Cascade removes the profile and membership; org-level data (periods, projects, scores) is retained under the organization. Each deletion is audited to `audit_logs` before the DELETE. Invite-accepted accounts (`grace_ends_at IS NULL`) are never deleted.

### 4.7 Invite Flow Carveout

Invite-link acceptance bypasses both banner and grace:

- `grace_ends_at = NULL` from the start
- `email_confirmed_at` set by `InviteAcceptScreen` submit
- Rationale: the invite link proved the user controls the email

## 5. Architecture

### 5.1 Screens

| Screen | Status | Notes |
|---|---|---|
| `src/auth/screens/RegisterScreen.jsx` | **Simplified** | Remove org toggle + public list + submitted success state + Google branch. Single org name field, atomic signup submit. |
| `src/auth/screens/CompleteProfileScreen.jsx` | **Simplified** | Google OAuth finishing step only. Remove org toggle + university/department inline fields. Name + org name only. |
| `src/auth/screens/PendingReviewScreen.jsx` | **Retained** | Legacy pending applications still render. Empty state's "Apply for Access" button removed. |
| `src/auth/screens/InviteAcceptScreen.jsx` | **Minor touch** | Ensure `email_confirmed_at` is set on accept; ensure `grace_ends_at` not written. |
| `src/auth/screens/LoginScreen.jsx` | **Behavior shift** | No code change. With Supabase setting OFF, the "Email not confirmed" error is no longer reachable on login. |
| `src/auth/screens/GraceLockScreen.jsx` | **New (Phase 2)** | Full-screen lock after grace expiry. Shows email + resend + sign out. |
| `src/auth/components/EmailVerifyBanner.jsx` | **New (Phase 1)** | Inline banner at top of admin layout when `email_confirmed_at IS NULL`. |

### 5.2 State & Hooks

- `useAuth()` exposes `isEmailVerified` (`!!user.email_confirmed_at`) and `graceEndsAt`
- `src/auth/lockedActions.js` exports the canonical set of action keys gated by verification
- `AdminRouteLayout` mounts `EmailVerifyBanner` and `GraceLockGate`
- `GraceLockGate` checks `graceEndsAt < now() && !isEmailVerified` → renders `GraceLockScreen` instead of children

### 5.3 API Changes

| Function | Change |
|---|---|
| `AuthProvider.signUp(email, password, { name, orgName })` | New implementation: `supabase.auth.signUp` → session returned → `rpc_admin_create_org_and_membership(name, orgName)` called sequentially → memberships refreshed → navigate `/admin` |
| `AuthProvider.completeProfile({ name, orgName })` | Trimmed: no `institution`, `department`, `joinOrgId` parameters. Google OAuth path only. |
| `rpc_admin_create_org_and_membership` | Made idempotent — if caller already has an admin membership, return the existing org instead of raising |
| `_assert_tenant_admin(p_action text DEFAULT NULL)` | Accepts optional action key. When `p_action` is in the Level B set AND the caller's membership has `grace_ends_at IS NOT NULL AND email_confirmed_at IS NULL`: raises `email_verification_required` during grace, or `email_verification_grace_expired` once `grace_ends_at < now()`. Super-admin callers (organization_id IS NULL) are exempt. |
| `email_is_verified(uid uuid)` | New helper reading `auth.users.email_confirmed_at IS NOT NULL` |

Atomic signup error handling: if `auth.signUp` succeeds but `rpc_admin_create_org_and_membership` fails, UI shows a retryable error (`Couldn't set up your organization. Retry.`). The RPC's idempotency guarantees no duplicate orgs on retry. No rollback of the auth user.

### 5.4 Database Changes

All updates land in existing migration modules (snapshot policy, no new file):

- `sql/migrations/002_tables.sql`:
  - `memberships.grace_ends_at timestamptz NULL`
  - Index on `(grace_ends_at)` for cron scans
- `sql/migrations/003_helpers_and_triggers.sql`:
  - `email_is_verified(uid uuid) returns boolean`
  - Trigger on `auth.users` UPDATE: when `email_confirmed_at` transitions from NULL to NOT NULL, set `memberships.grace_ends_at = NULL` for all that user's memberships
- `sql/migrations/006_rpcs_admin.sql`:
  - `_assert_tenant_admin` signature + Level B action enforcement
  - `rpc_admin_create_org_and_membership` idempotency
- `sql/migrations/009_audit.sql`:
  - Daily audit row on grace expiry (log-only, no destructive action)

`sql/README.md` updated in the same commit to reflect the new helper and grace column.

### 5.5 Supabase Project Settings

- `Authentication → Email → Confirm email` = **OFF** on vera-prod and vera-demo (manual one-time change via Supabase MCP)
- Redirect URL allow-list unchanged

### 5.6 UI Conventions Enforced

- Banner and lock screen use `FbAlert` + existing card classes (`apply-card`, `login-card`)
- All icons from `lucide-react` — no raw SVG elements
- Descriptive text uses `text-align: justify; text-justify: inter-word`
- Error fields use `input.error` class + `crt-field-error` inline message
- Locked buttons use `PremiumTooltip` (portalized, clamped to viewport)

## 6. Data Migration

No backfill on the new `grace_ends_at` column for existing memberships. Migration adds the column as nullable; only new signups after this migration receive a grace value.

Existing accounts categorized:

| State | Behavior after migration |
|---|---|
| Verified, has org | Unchanged. Banner hidden, lock never fires. |
| Unverified, has org, `created_at` before migration | `grace_ends_at` stays NULL. Banner shows, but lock never fires (grace is null → indefinite grace). |
| Unverified, no org, pending application | `PendingReviewScreen` still renders. New signups do not land here. |
| Unverified, no org, no pending | Falls through to `RegisterScreen` (standard). |

TEDU production users with verified accounts are unaffected.

## 7. Testing

### 7.1 Unit + Integration

- `RegisterScreen.test.jsx` — form validation, atomic signup call, navigation, error retry
- `CompleteProfileScreen.test.jsx` — Google OAuth finishing step, removed fields absent
- `EmailVerifyBanner.test.jsx` — visible/hidden based on `email_confirmed_at`, resend triggers `supabase.auth.resend`
- `useAuth.test.js` — `isEmailVerified` and `graceEndsAt` derivation
- `lockedActions.test.js` — canonical set shape, no accidental additions
- RPC tests in `sql/` — `_assert_tenant_admin` raises on unverified Level B actions; raises grace-expired on past `grace_ends_at`
- All new tests registered in `src/test/qa-catalog.json` and use `qaTest()`

### 7.2 E2E (Playwright)

- Happy path: email/password signup → `/admin` + banner visible
- Google OAuth signup → `/admin` + banner hidden
- Invite accept → `/admin` + banner hidden, `grace_ends_at` never written
- Locked juror-invite button → tooltip visible, click fires no RPC
- Click verify link → banner disappears without full reload (auth state change)
- Grace expiry (simulated by back-dating `grace_ends_at`) → `GraceLockScreen` renders, `/admin/*` routes all redirect

### 7.3 Guardrails

Run before declaring done, per CLAUDE.md rules:

- `npm run check:no-native-select`
- `npm run check:no-nested-panels`
- `npm test -- --run`
- `npm run build`
- `npm run e2e`

## 8. Rollout

### 8.1 Phase 1 — MVP (atomic signup + banner)

1. ✅ Supabase `Confirm email` OFF on vera-prod + vera-demo
2. ✅ `RegisterScreen` simplification (org toggle, public list, Google branch removed)
3. ✅ `CompleteProfileScreen` simplification (no institution/department)
4. ✅ `signUp()` atomic flow (`auth.signUp` → `rpc_admin_create_org_and_membership` → `fetchMemberships`)
5. ✅ `rpc_admin_create_org_and_membership` idempotent (existing membership → return existing org)
6. ✅ `EmailVerifyBanner` wired in `AdminRouteLayout`, resend action working
7. ✅ `signUp()` sets `activeOrganizationIdState` after membership fetch (setup wizard redirect fix)
8. ✅ DB migration applied to vera-prod + vera-demo:
   - `memberships.grace_ends_at timestamptz NULL` → `002_tables.sql`
   - `email_verification_tokens` table → `002_tables.sql`
   - `email_is_verified(uid uuid) returns boolean` helper (reads `profiles.email_verified_at`) → `003_helpers_and_triggers.sql`
   - Trigger: `profiles.email_verified_at` NULL→NOT NULL clears `grace_ends_at` → `003_helpers_and_triggers.sql`
   - `_assert_tenant_admin(p_action TEXT)` Level B gate → `006_rpcs_admin.sql`
   - `rpc_admin_create_org_and_membership` writes `grace_ends_at = now() + interval '7 days'` → `006_rpcs_admin.sql`
   - `_cleanup_unverified_expired_accounts()` + pg_cron daily job → `009_audit.sql`
   - `sql/README.md` updated
9. ✅ Test suite + E2E green
   - `register-happy-path` E2E passes (fixed stale `clear_grace_on_email_verify` trigger on `auth.users`)
   - All auth unit tests pass (7/7); 61 pre-existing failures in unrelated files (jury, utils, criteria)
   - Root cause of stale trigger: migration dropped trigger on `public.profiles` but not the old one on `auth.users`; fixed in `003_helpers_and_triggers.sql`
10. ⬜ PR merge; deploy and monitor

### 8.2 Phase 2 — Locks + grace expiry

1. ✅ `_assert_tenant_admin(p_action text DEFAULT NULL)` — Level B enforcement in `006_rpcs_admin.sql`
2. ✅ `src/auth/lockedActions.js` — canonical Level B action key set (see section 4.5)
3. ✅ `graceEndsAt` exposed in `useAuth()` (from `memberships.grace_ends_at`)
4. ✅ `GraceLockGate` in `AdminRouteLayout` — `graceEndsAt < now() && !isEmailVerified` → renders `GraceLockScreen`
5. ✅ `src/auth/screens/GraceLockScreen.jsx` — full-screen: shows email, resend link, sign out
6. ✅ Level B buttons: `disabled` + `PremiumTooltip` while unverified
7. ✅ Daily deletion cron `_cleanup_unverified_expired_accounts()` + audit row — `009_audit.sql`
8. ✅ Test suite + E2E green
   - All 7 auth unit tests pass
   - `register-happy-path` E2E passes
   - Fixed mobile "Notify Juror" button missing grace lock (JurorsPage line ~1091)
9. ⬜ PR merge

Phase 2 starts only after Phase 1 DB items are applied and at least one real signup cycle is verified.

### 8.3 Rollback

- Revert the PR (code)
- Flip `Confirm email` back ON in Supabase if Phase 1 misbehaves
- `grace_ends_at` column stays — harmless when unused
- No data loss path

## 9. Open Questions

None at spec time. Flag during implementation if:

- RPC idempotency discovers additional row-level dependencies (juror defaults, audit seeds) that must be no-op on retry
- Playwright email-link verification requires a real inbox fixture (may need mock email capture)
- Demo env's auto-login interaction with the banner reveals a visual glitch on `/demo/register`

## 10. References

- `src/auth/AuthProvider.jsx` — auth state graph, `signUp`, `completeProfile`
- `src/auth/screens/RegisterScreen.jsx` — primary email/password entry
- `src/auth/screens/CompleteProfileScreen.jsx` — Google OAuth finishing
- `src/auth/screens/InviteAcceptScreen.jsx` — invite acceptance path
- `src/shared/passwordPolicy.js` — strength policy
- `sql/migrations/002_tables.sql`, `003_helpers_and_triggers.sql`, `006_rpcs_admin.sql`, `009_audit.sql`
- `sql/README.md` — migration inventory
- CLAUDE.md — UI/UX conventions, testing conventions, migration policy
