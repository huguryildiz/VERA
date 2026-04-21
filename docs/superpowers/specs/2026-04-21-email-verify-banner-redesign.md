# Email Verify Banner Redesign

**Date:** 2026-04-21
**Status:** Approved

## Overview

Restyle the `EmailVerifyBanner` from a plain sticky strip into an amber-themed strip that matches the `lock-notice` design language, and add a live countdown timer showing time remaining until account deletion.

## Layout

Full-width sticky top strip (~52px tall). Two-column flex row:

- **Left column (72px):** `MailWarning` icon in an amber circle wrap (same dimensions/style as `.lock-notice-icon-wrap` with pulsing ring). Countdown badge directly below the icon (same monospace style as `.lock-notice-badge`).
- **Right column (flex-1):** Message text on the left, Resend button on the far right.

```
┌──────────────────────────────────────────────────────────────────────┐
│ [icon]   Verify your email — unverified accounts are                 │
│ [3 DAYS] automatically deleted after 7 days.           [Resend link] │
└──────────────────────────────────────────────────────────────────────┘
```

## Styling

- Background: amber gradient matching `.lock-notice` (`rgba(245, 158, 11, 0.08)` dark / `#fef3c7` light)
- Sweeping shimmer animation: reuse `lock-notice::before` keyframe (`shimmerSlide`)
- Glowing bottom bar: reuse `lock-notice::after` pattern
- Icon wrap: same as `.lock-notice-icon-wrap` — amber circle, pulsing ring (`lock-pulse` keyframe)
- Badge: same as `.lock-notice-badge` — monospace, uppercase, amber-tinted
- No new keyframe animations — borrow existing ones from `components.css`
- CSS class prefix: `evb-` (existing classes extended, no renames)

## Countdown Logic

Source: `graceEndsAt` from `AuthContext` (already available, set from `memberships[0]?.grace_ends_at`).

Timer: `setInterval` every 1000ms, cleared on unmount.

Display format based on remaining milliseconds:

| Remaining        | Format    | Example   |
|------------------|-----------|-----------|
| > 48 hours       | `X DAYS`  | `3 DAYS`  |
| 1 hour – 48 hours | `XhYm`   | `22h 14m` |
| < 1 hour         | `XmYs`    | `45m 30s` |
| Expired / ≤ 0    | `SOON`    | `SOON`    |
| `graceEndsAt` null (legacy accounts) | `7 DAYS` (static) | `7 DAYS` |

## Files Changed

- `src/auth/components/EmailVerifyBanner.jsx` — add countdown hook logic, restructure JSX to two-column layout
- `src/styles/components.css` — extend `evb-*` block with new left-column, icon-wrap, badge styles; add amber gradient + shimmer + dark-mode overrides

## Out of Scope

- No changes to how `graceEndsAt` is fetched or set
- No changes to Resend link / error / sent states
- No changes to other pages or components
