# Security Policy Enforcement Design

**Date:** 2026-04-08
**Status:** Approved

## Problem

The Security Policy drawer saves all toggle values to the `security_policy` DB table, but nothing reads them. Every auth method, password rule, token TTL, PIN lockout limit, and notification preference is hardcoded throughout the codebase. The drawer is a facade.

## Goal

Make each policy field actively enforced by the system. Changes saved in the drawer take effect immediately without code deploys.

## Out of Scope

- Supabase Management API integration (disabling Google/email at infrastructure level) — separate future task
- `allowMultiDevice` — toggle removed from the drawer entirely; multi-device sessions work by default and enforcement is not planned

---

## Decisions

| Question | Decision |
|---|---|
| Max Login Attempts scope | Jury PIN lockout only (not admin login) |
| Auth method toggle enforcement level | UI + AuthProvider layer (app-level, not Supabase infra) |
| Multi-device enforcement | Removed from scope entirely |
| CC notification granularity | Per-event toggles: `ccOnPinReset`, `ccOnScoreEdit` |

---

## Architecture

### Approach: Policy Context

A `SecurityPolicyContext` is created in `src/shared/auth/`. `AuthProvider` fetches the policy once on mount (parallel to session init) and exposes it via context. All consumers read from `useSecurityPolicy()`. On failure, `DEFAULT_POLICY` is used silently — user flows are never blocked.

When `setSecurityPolicy` is called from the drawer, the context is updated immediately — no page reload required.

---

## Section 1: Data Layer

### New Migration

A new migration updates the `security_policy` table default JSONB to include all fields consistently:

```jsonb
{
  "googleOAuth": true,
  "emailPassword": true,
  "rememberMe": true,
  "minPasswordLength": 8,
  "maxLoginAttempts": 5,
  "requireSpecialChars": true,
  "tokenTtl": "24h",
  "ccOnPinReset": true,
  "ccOnScoreEdit": false
}
```

`allowMultiDevice` is removed from the JSONB schema — the drawer no longer shows this toggle.

`ccSuperAdminOnPinReset` is renamed to `ccOnPinReset` for consistency with `ccOnScoreEdit`.

### RPC: `rpc_jury_verify_pin`

Replace hardcoded `v_max_attempts INT := 5` with a dynamic read:

```sql
SELECT (policy->>'maxLoginAttempts')::INT INTO v_max_attempts
FROM security_policy WHERE id = 1;
```

The lockout duration (30 minutes) remains hardcoded — it is not a policy field.

### RPC: `rpc_admin_generate_entry_token`

Replace hardcoded `INTERVAL '24 hours'` with a policy-driven calculation:

```sql
DECLARE
  v_ttl_str TEXT;
  v_ttl INTERVAL;
BEGIN
  SELECT policy->>'tokenTtl' INTO v_ttl_str FROM security_policy WHERE id = 1;
  v_ttl := CASE v_ttl_str
    WHEN '12h' THEN INTERVAL '12 hours'
    WHEN '48h' THEN INTERVAL '48 hours'
    WHEN '7d'  THEN INTERVAL '7 days'
    ELSE            INTERVAL '24 hours'  -- default / '24h'
  END;
  v_expires_at := now() + v_ttl;
```

---

## Section 2: Frontend Context Layer

### New File: `src/shared/auth/SecurityPolicyContext.jsx`

```jsx
const DEFAULT_POLICY = {
  googleOAuth: true,
  emailPassword: true,
  rememberMe: true,
  minPasswordLength: 8,
  maxLoginAttempts: 5,
  requireSpecialChars: true,
  tokenTtl: "24h",
  ccOnPinReset: true,
  ccOnScoreEdit: false,
};
// allowMultiDevice intentionally omitted — removed from drawer and schema

export const SecurityPolicyContext = createContext(DEFAULT_POLICY);
export const useSecurityPolicy = () => useContext(SecurityPolicyContext);
```

### `AuthProvider` Changes

On mount, fetch policy in parallel with session init:

```js
const [policy, setPolicy] = useState(DEFAULT_POLICY);

useEffect(() => {
  getSecurityPolicy()
    .then(setPolicy)
    .catch(() => {}); // silent fallback to DEFAULT_POLICY
}, []);
```

Wrap children in `SecurityPolicyContext.Provider value={policy}`.

Expose an `updatePolicy` function via context so any consumer can update the live policy:

```js
export const SecurityPolicyContext = createContext({
  policy: DEFAULT_POLICY,
  updatePolicy: () => {},
});
export const useSecurityPolicy = () => useContext(SecurityPolicyContext).policy;
export const useUpdatePolicy  = () => useContext(SecurityPolicyContext).updatePolicy;
```

After `setSecurityPolicy` is called (in `SettingsPage.handleSaveSecurityPolicy`), call `updatePolicy` to propagate immediately:

```js
// In SettingsPage:
const { updatePolicy } = useUpdatePolicy();

const handleSaveSecurityPolicy = useCallback(async (p) => {
  await setSecurityPolicy(p);
  updatePolicy(p);
  setSecurityPolicyState(p);
  _toast.success("Security policy saved");
}, [updatePolicy, _toast]);
```

Enforce auth method toggles inside `signIn()` and `signInWithGoogle()`:

```js
if (!policy.emailPassword) throw new Error("Email/password login is disabled.");
if (!policy.googleOAuth)   throw new Error("Google sign-in is disabled.");
```

### Consumer: `LoginForm`

- `googleOAuth === false` → hide Google sign-in button entirely
- `emailPassword === false` → hide email/password form
- `rememberMe === false` → hide "Remember me" checkbox; if hidden, do not persist the flag

### Consumers: `RegisterForm` + `ResetPasswordCreateForm`

Password validation rules become dynamic:

```js
const { minPasswordLength, requireSpecialChars } = useSecurityPolicy();

const isValid = password.length >= minPasswordLength
  && (!requireSpecialChars || /[^A-Za-z0-9]/.test(password));
```

Error messages reflect the live policy values (e.g., "At least 8 characters required").

---

## Section 3: Notification Toggles

### `SecurityPolicyDrawer` UI

Replace single "CC Me on PIN Reset Requests" row with two rows:

```
NOTIFICATIONS
┌──────────────────────────────────────────────────────┐
│ CC Me on PIN Reset Requests              [toggle]    │
│ Receive a copy when a juror requests a PIN reset     │
└──────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────┐
│ CC Me on Score Edit Requests             [toggle]    │
│ Receive a copy when a juror requests score editing   │
└──────────────────────────────────────────────────────┘
```

### Edge Function: `request-pin-reset`

Already reads a CC flag. Rename `ccSuperAdminOnPinReset` → `ccOnPinReset` in the policy read.

### Edge Function: `request-score-edit`

Currently sends only to org_admins. Add CC logic mirroring `request-pin-reset`:

```ts
const ccOnScoreEdit = policy?.ccOnScoreEdit ?? false;
if (ccOnScoreEdit) {
  // fetch super_admin emails (same pattern as request-pin-reset)
  // add to cc: [] field of Resend payload
}
```

---

## Files Touched

| File | Change |
|---|---|
| `sql/migrations/` | New migration: policy JSONB default, rename `ccSuperAdminOnPinReset`, update `rpc_jury_verify_pin`, update `rpc_admin_generate_entry_token` |
| `src/shared/auth/SecurityPolicyContext.jsx` | New file |
| `src/shared/auth/AuthProvider.jsx` | Fetch policy on mount, enforce auth toggles, update context on save |
| `src/admin/pages/SettingsPage.jsx` | Pass `setPolicy` from context update after save |
| `src/components/auth/LoginForm.jsx` | Conditional render based on policy |
| `src/components/auth/RegisterForm.jsx` | Dynamic password validation |
| `src/components/auth/ResetPasswordCreateForm.jsx` | Dynamic password validation |
| `src/admin/drawers/SecurityPolicyDrawer.jsx` | Remove `allowMultiDevice` toggle; replace `ccSuperAdminOnPinReset` with `ccOnPinReset` + `ccOnScoreEdit` |
| `supabase/functions/request-pin-reset/index.ts` | Rename policy field |
| `supabase/functions/request-score-edit/index.ts` | Add CC logic |

---

## Error Handling

- Policy fetch failure → silent fallback to `DEFAULT_POLICY`, no user-visible error
- If both `googleOAuth` and `emailPassword` are false, a super admin could lock everyone out. This is not guarded at the UI level — the drawer allows it. Future improvement: warn if all auth methods are disabled.
- RPC reads of `security_policy` use `WHERE id = 1`. If the row doesn't exist (fresh DB), RPCs fall back to hardcoded defaults already present in the functions.
