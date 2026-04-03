# Phase 12 Implementation Summary — Auth Screens

## Overview

Rewrote all six authentication screens from scratch using the `vera-premium-prototype.html`
as the 1:1 visual reference. All new screens use CSS classes already defined in
`src/styles/vera.css` (glassmorphic `.login-screen`/`.login-card` and `.apply-screen`/`.apply-card`
design tokens) — zero Tailwind or shadcn dependencies.

## Files Created

| File | Replaces | CSS Pattern |
|---|---|---|
| `src/auth/LoginScreen.jsx` | `src/components/auth/LoginForm.jsx` | `login-screen` / `login-card` |
| `src/auth/RegisterScreen.jsx` | `src/components/auth/RegisterForm.jsx` | `apply-screen` / `apply-card` |
| `src/auth/ForgotPasswordScreen.jsx` | `src/components/auth/ForgotPasswordForm.jsx` | `login-screen` / `login-card` |
| `src/auth/ResetPasswordScreen.jsx` | `src/components/auth/ResetPasswordCreateForm.jsx` | `login-screen` / `login-card` |
| `src/auth/CompleteProfileScreen.jsx` | `src/components/auth/CompleteProfileForm.jsx` | `login-screen` / `login-card` |
| `src/auth/PendingReviewScreen.jsx` | `src/admin/components/PendingReviewGate.jsx` | `login-screen` / `login-card` |

## Files Deleted

- `src/components/auth/LoginForm.jsx`
- `src/components/auth/RegisterForm.jsx`
- `src/components/auth/ForgotPasswordForm.jsx`
- `src/components/auth/ResetPasswordCreateForm.jsx`
- `src/components/auth/CompleteProfileForm.jsx`
- `src/admin/components/PendingReviewGate.jsx`

## Files Updated

- `src/admin/layout/AdminLayout.jsx` — all 6 lazy imports point to `src/auth/*` screens
- `src/__tests__/App.storage.test.jsx` — vi.mock paths updated to match new locations

## Design Fidelity

Each screen matches the prototype exactly:

- **LoginScreen** — glassmorphic card, ShieldCheck icon, email/password with eye toggle,
  remember-me checkbox, Cloudflare Turnstile captcha (conditional), Google OAuth button,
  forgot-password inline link, "Apply for access" footer link
- **RegisterScreen** — apply-screen layout, university → department cascade selects
  (loaded from `listOrganizationsPublic()`), password + confirm with eye toggle,
  animated success state with `apply-success-*` classes and detail card
- **ForgotPasswordScreen** — email input form + sent confirmation state with green icon
- **ResetPasswordScreen** — new password + confirm with eye toggles, strength validation
  (≥10 chars, upper/lower/digit/symbol), done state with success icon
- **CompleteProfileScreen** — disabled email field, full name, university/dept grid,
  `TenantSearchDropdown` for tenant selection
- **PendingReviewScreen** — pending and rejected application lists with badge states,
  Return Home + Sign out actions

## Preserved Logic

- Turnstile captcha widget lifecycle (render/reset/expire) preserved in LoginScreen
- Password strength validation preserved in ResetPasswordScreen
- University → department cascade with `listOrganizationsPublic()` preserved in RegisterScreen
- `getMyApplications()` call preserved in PendingReviewScreen with `formatDate` helper
- `TenantSearchDropdown` (kept at `src/components/auth/TenantSearchDropdown.jsx`) reused
  in CompleteProfileScreen
- All prop signatures unchanged so AdminLayout required no logic changes
