# Session 10b — misc.css Distribution

**Date:** 2026-04-23
**Branch:** main
**Build:** ✅ green after each commit
**Commits:** 2 (`refactor(styles): distribute #page-X …`, `refactor(styles): extract theme overrides …`)

---

## Scope

After Session 10 split `components.css` into 8 files, the resulting `misc.css`
ballooned to 2655 lines — far above the 600-line policy target and still
containing feature-specific CSS plus theme overrides that should have been
co-located. This session distributes those blocks to their correct homes.

**Policy:** every CSS file < 600 lines.

---

## Phase 1 — Feature-specific blocks → feature CSS

Four blocks of page/component-specific rules lived in `misc.css`. They are
now co-located with the feature that owns them:

| Source block in misc.css | Destination | Lines moved |
|---|---|---|
| `#page-entry-control` portrait refinement (`@media (max-width: 768px)`) | `src/admin/features/entry-control/EntryControlPage.css` | 204 |
| `#page-audit` portrait refinement (`@media (max-width: 768px)`) | `src/admin/features/audit/AuditLogPage.css` | 155 |
| `#page-settings` equal-height + portrait + landscape | `src/admin/features/settings/SettingsPage.css` | 70 |
| Email Verify Banner (`.evb-*`, dark + light mode) | **new** `src/auth/features/verify-email/EmailVerifyBanner.css` | ~103 |

`EmailVerifyBanner.css` is imported directly from `EmailVerifyBanner.jsx`
(co-location pattern used for other shared components). It reuses the
`ln-shimmer` / `ln-glow-bar` keyframes defined in `misc.css` (inside the
shared `.lock-notice` block) — both files are bundled together via
`main.css`, so keyframe resolution works across files.

---

## Phase 2 — Theme overrides → theme/

Misc.css sections 3–17 were explicitly labeled as "Dark mode: X" and
"Light mode: X" blocks. These are now in two dedicated theme files:

| File | Lines | Contents |
|---|---|---|
| `src/styles/theme/light-overrides.css` | 125 | `body:not(.dark-mode)` overrides for `.fb-alert`, `.kpi`, `.tab-btn`, `.settings-row/.settings-card`, typography hierarchy (`.page-title`/`h1`/`h2`/`.section-*`/`.helper-text`/`.text-muted`), `.sidebar-item`/`.tab-item` |
| `src/styles/theme/dark-overrides.css` | 130 | `.dark-mode` overrides for `.surface`, `.overlay`, `.glass`/`.glass-card`/`.glass-hover`, `.card`/`.kpi`/`.table-wrap` depth, `th`/`td`, form inputs, `.auth-card`/`.login-card`/`.apply-card`, settings card depth, `.admin-sidebar`/`.admin-header` |

Both files under 130 lines — well inside the 600-line policy; no further
split needed.

**Also removed: duplicate `.btn-success` rules.** misc.css had an exact copy
of the `.btn.btn-success` block that was already in `components/buttons.css`
(added in S10 split). Duplicate deleted.

**Component-scoped theme overrides stay with their component:**
`.vera-es-*`, `.sec-popover`, `.lock-notice`, `.ph-avatar-menu`,
`.evb-wrap`, custom scrollbars, `.team-chip`, `#fb-demo-menu`, maintenance
banners — each of these has both a base rule and a dark/light override
that belong together, so they remain in `misc.css` (for genuinely shared
components) or the feature CSS (for `.evb-wrap`).

---

## main.css — new imports

```css
@import './components/buttons.css';
@import './components/cards.css';
@import './components/forms.css';
@import './components/alerts.css';
@import './components/tables.css';
@import './components/pills-badges.css';
@import './components/nav-menu.css';
@import './components/misc.css';
@import './theme/light-overrides.css';
@import './theme/dark-overrides.css';
```

Theme files come after the component set so their `!important` overrides
win when the cascade matters.

---

## Line-count audit

### Files affected this session

| File | Before S10b | After S10b | Δ |
|---|---|---|---|
| `src/styles/components/misc.css` | 2655 | 1871 | **−784** |
| `src/admin/features/entry-control/EntryControlPage.css` | 286 | 491 | +205 |
| `src/admin/features/audit/AuditLogPage.css` | 489 | 645 | +156 |
| `src/admin/features/settings/SettingsPage.css` | 101 | 172 | +71 |
| `src/auth/features/verify-email/EmailVerifyBanner.css` | — | 102 | new |
| `src/styles/theme/light-overrides.css` | — | 125 | new |
| `src/styles/theme/dark-overrides.css` | — | 130 | new |

### <600 compliance snapshot

**Component files (all compliant):**
- `components/alerts.css` — 114 ✅
- `components/buttons.css` — 129 ✅
- `components/cards.css` — 134 ✅
- `components/forms.css` — 70 ✅
- `components/nav-menu.css` — 147 ✅
- `components/pills-badges.css` — 128 ✅
- `components/tables.css` — 151 ✅
- `theme/light-overrides.css` — 125 ✅
- `theme/dark-overrides.css` — 130 ✅

**Over 600 — deferred to S10-cleanup-2 (separate session):**
- `src/jury/shared/jury-base.css` — **4021**
- `src/admin/features/criteria/CriteriaPage.css` — **2480**
- `src/admin/features/setup-wizard/SetupWizardPage.css` — **2377**
- `src/admin/features/outcomes/OutcomesPage.css` — **2056**
- `src/styles/components/misc.css` — **1871**
- `src/admin/features/periods/PeriodsPage.css` — **1334**
- `src/auth/shared/auth-base.css` — 1178 *(note: per Session 9 report, auth-base.css was trimmed to 210 lines; this figure reflects the current file on disk and should be re-checked in S10-cleanup-2)*
- `src/admin/features/reviews/ReviewsPage.css` — 975
- `src/admin/features/heatmap/HeatmapPage.css` — 719
- `src/admin/features/audit/AuditLogPage.css` — 645 *(borderline; just over due to S10b additions — slate for a small cleanup pass)*
- `src/admin/features/rankings/RankingsPage.css` — 612

---

## What remains in misc.css (1871 lines)

Real component-scoped content that doesn't fit any of the 7 pattern files:

- Custom scrollbars (webkit + Firefox)
- Team chip base + dark override (mixed, stays together)
- `#fb-demo-toggle` / `#fb-demo-menu` (demo mode switcher, has both base + light override)
- UserAvatarMenu dark/light overrides (base lives in `nav-menu.css`, overrides here)
- `[data-tooltip]` global CSS attribute tooltip
- Security Signal Pill + popover (`.sec-pill-*`, `.sec-popover*`)
- Maintenance gate banners (`.maintenance-super-banner`, `.maintenance-upcoming-banner`)
- `vera-es-*` Empty State Design System (~600 lines — largest remaining chunk)
- `vera-es-no-data` ghost-row empty state (Jurors / Projects)
- `vera-es-page-prompt`
- Lock Notice Banner shared between Outcomes + Criteria
- Unified mobile card `.mcard`
- Row action button `.row-action-btn`
- Mobile card selection global rule
- Admin team owner pill

**Next candidate for extraction** (S10-cleanup-2): the `.vera-es-*` empty
state system could move to `src/styles/components/empty-states.css` (est.
~600 lines), which would leave misc.css at ~1270 and prepare for another
round of trimming.

---

## Commits

1. `f64728d refactor(styles): distribute #page-X rules from misc.css to feature CSS` (6 files, +541/−533)
2. `ff3ff59 refactor(styles): extract theme overrides from misc.css to theme/` (4 files, +265/−265)

Note: working tree also contains unrelated parallel changes by Codex
(admin feature restructure — shared hooks/modals/components moving to
`admin/shared/` and `admin/features/`). Those were **not** included in
S10b commits; only the 10 CSS files touched by this session were staged.

---

## State after session

- `src/styles/theme/` — 2 new files (`light-overrides.css`, `dark-overrides.css`)
- `src/styles/components/misc.css` — 2655 → 1871 (−784 lines, −29.5%)
- 4 feature CSS files gained their portrait / component-scoped blocks
- `src/styles/main.css` — 2 new theme imports
- **8 of 10 non-jury/non-auth-base CSS files now under 600 lines**
- **Next (S10-cleanup-2):** split `vera-es-*` empty state out of misc.css,
  audit `auth-base.css` actual size, begin chipping away at the four
  2k+-line feature CSS files
