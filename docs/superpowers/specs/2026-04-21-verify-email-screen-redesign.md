# Verify Email Screen Redesign — Hero/Ambient

**Date:** 2026-04-21
**Status:** Approved

---

## Overview

Replace the current glassmorphism card layout of `VerifyEmailScreen` with a Hero/Ambient full-screen design — large central icon surrounded by concentric ambient rings, state-specific animations, and a minimal info card below. Inspired by Stripe/Vercel confirmation moments.

Also fixes a CLAUDE.md violation: the current success state uses an inline `<svg>` checkmark instead of a lucide-react icon.

---

## Layout

Single full-screen column (`display: flex; flex-direction: column; align-items: center; justify-content: center`) with no outer card. Background stays `var(--bg)` with a subtle ambient radial glow behind the hero icon whose color shifts per state.

**Structure (top to bottom):**
1. VERA logo mark (diamond + wordmark, top-left absolute or centered above hero at small sizes)
2. Hero zone — concentric ring system + central icon circle
3. State title + subtitle (large type, centered)
4. Info card — compact rounded surface holding secondary content (email badge, error message, action buttons)
5. VERA wordmark watermark (bottom center, low opacity)

---

## States & Animations

### Pending
- **Rings:** 3 concentric rings, color `var(--accent)` (indigo). Keyframe `ring-pulse`: scale 0.92→1.08 with opacity 0.18→0.45, staggered delays (0s / 0.5s / 1s), `ease-in-out infinite`.
- **Hero icon:** `Loader2` from lucide-react, spinning via `vef-spin` (`rotate 1s linear infinite`).
- **Below hero:** Title "Verifying your email" + subtitle. Three bouncing dots (`dot-bounce` keyframe, staggered 0 / 0.2s / 0.4s). Info hint about single-use / 24h expiry.

### Success
- **Rings:** Color `var(--success)` (green). Keyframe `ring-emit`: scale 0.85→1.12, opacity 0.5→0, fires once on state entry (`animation-iteration-count: 1`, `animation-fill-mode: forwards`).
- **Hero icon:** `MailCheck` from lucide-react. Container plays `icon-pop` keyframe (scale 0→1.15→1, opacity 0→1) on state entry.
- **Below hero:** Title "Email verified" + subtitle. Email badge row (mail icon + address). Pulsing green status dot + "Redirecting to dashboard…" text.
- Auto-redirect after 2 000 ms (existing behavior retained).

### Error
- **Rings:** Color `var(--danger)` (red). Static (no animation) — the stillness contrasts with the shaking icon.
- **Hero icon:** `MailWarning` from lucide-react. Container plays `icon-shake` keyframe (translate-x rapid oscillation, fires once on entry).
- **Below hero:** Title "Verification failed" + subtitle. Error message in `FbAlert variant="danger"`. Resend button (primary) or "Link sent" confirmation row. Ghost "Back to dashboard" button.

---

## Animation Keyframes

```
ring-pulse   — scale + opacity oscillation, infinite, for pending rings
ring-emit    — scale 0.85→1.12 + opacity 0.5→0, once, for success rings
icon-pop     — scale 0→1.15→1 + opacity 0→1, once, ~400ms ease-out
icon-shake   — translateX oscillation (±6px → ±4px → ±2px → 0), once, ~500ms
dot-bounce   — translateY 0→-8px→0, infinite, ease-in-out
vef-spin     — rotate 360deg, infinite linear (already exists)
```

All animation durations and delays use CSS custom properties where practical so dark/reduced-motion overrides are straightforward.

---

## Color Tokens

State colors reference existing CSS variables:
- Pending: `var(--accent)` / `var(--accent-glow)` for ring tint
- Success: `var(--success)` (green)
- Error: `var(--danger)` (red/rose)

Ambient background glow behind hero: `radial-gradient` absolutely positioned, color matches state, `pointer-events: none`.

---

## Icon Compliance (CLAUDE.md Fix)

The current success state renders an inline `<path d="M5 13l4 4L19 7" />` inside a raw `<svg>`. This violates the "all icons: lucide-react only" rule. Replace with:
- Success: `MailCheck` (lucide-react)
- Error: `MailWarning` (already used — keep)
- Pending: `Loader2` (already used — keep)

No inline `<svg>` elements remain after this change.

---

## Info Card

Compact rounded surface (`border-radius: 16px`, `border: 1px solid var(--border-subtle)`, `background: var(--surface-raised)`). Holds secondary content only — never the hero. Max-width ~400px, centered. Content varies by state:
- Pending: info hint (single-use link, 24h expiry)
- Success: email badge + redirect notice
- Error: `FbAlert` danger + resend action + ghost back button

---

## CSS Scope

New CSS lives in `src/styles/auth.css` under the existing `/* ── Verify Email Screen ──*/` section. All new classes prefixed `vef-`. Existing `vef-*` classes are updated in place — no new CSS file. Light-mode overrides go in the existing `body:not(.dark-mode)` block at the bottom of the file.

---

## Responsive

- Mobile (≤480px): hero icon circle scales down to 72px, ring radii reduce proportionally, info card gets side padding 16px.
- Desktop: hero circle 96px, rings at full radius.
- `prefers-reduced-motion`: all ring + icon animations disabled; spinner stays (functional feedback).

---

## Theme Fidelity

All interactive elements must use existing VERA classes — no new button or form styles:
- Primary action button → `apply-submit` class (same as login/register screens)
- Ghost/secondary button → `vef-btn-ghost` class (already defined in auth.css)
- Email badge row → `vef-email-row` (already defined)
- Error alerts → `<FbAlert variant="danger">` (never inline red text)
- Typography, spacing, border-radius, and color tokens all from the existing CSS variable system

The hero zone and ring system are the only genuinely new CSS. Everything else reuses or refines what exists.

---

## What Does Not Change

- State logic (`pending | success | error`), `resendState`, `onResend`, `normalize()`, auto-redirect — all preserved exactly.
- API calls (`confirmEmailVerification`, `sendEmailVerification`) — untouched.
- Demo path detection (`isDemo`, `dashPath`) — untouched.
- `aria-live="polite"` and `role="status"` — retained.
