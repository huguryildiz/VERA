# Phase 9 Implementation Summary — System Pages

**Date:** 2026-04-03
**Plan:** [2026-04-ui-parity-repair.md](../2026-04-ui-parity-repair.md)
**Prototype reference:** `vera-premium-prototype.html` lines 14797–16066

---

## What Was Implemented

### New Pages

Five new top-level admin pages replacing the old `src/admin/pages/` and
`src/admin/settings/` fragments:

| File | Prototype Range | Description |
| ---- | --------------- | ----------- |
| `src/admin/EntryControlPage.jsx` | 14797–15050 | Entry token management: list, create, revoke tokens; access log |
| `src/admin/PinBlockingPage.jsx` | 15050–15159 | PIN lockout monitor: KPI strip, active lockouts table, policy snapshot |
| `src/admin/AuditLogPage.jsx` | 15159–15621 | Audit log: filters, pagination, event detail drawer, export |
| `src/admin/ExportPage.jsx` | 15621–15647 | Export & Backup: scores XLSX, jurors XLSX, full JSON backup |
| `src/admin/SettingsPage.jsx` | 15647–16066 | Settings: org-admin profile/security/org-access view + super-admin control center |

### AdminLayout Wiring

Added imports and render branches in `src/admin/layout/AdminLayout.jsx` for
all five new tabs: `entry-control`, `pin-lock`, `audit-log`, `settings`, `export`.

### File Cleanup

Deleted seven old files that were replaced by the new pages:

- `src/admin/pages/EntryControlPage.jsx`
- `src/admin/pages/AuditLogPage.jsx`
- `src/admin/pages/ExportPage.jsx`
- `src/admin/pages/OrgSettingsPage.jsx`
- `src/admin/settings/PinResetDialog.jsx`
- `src/admin/settings/AuditLogCard.jsx`
- `src/admin/settings/ExportBackupPanel.jsx`

Updated `src/AdminPanel.jsx` (legacy dead-code file) to fix broken import paths
after deletion.

---

## Key Design Decisions

### SettingsPage: Dual-Mode Rendering

`SettingsPage` renders two completely different layouts depending on `isSuper`
from `useAuth()`:

- **Org-admin view** — profile card, security & sessions card, organization access
  (read-only), permissions summary, danger zone.
- **Super-admin control center** — KPI strip derived from `orgList`, organization
  management table with search + create/edit, pending approvals panel,
  platform governance, cross-org memberships table, platform danger zone.

### ProfileEditModal: Self-Contained with createPortal

`UserAvatarMenu` already renders its own profile modal from its own
`useProfileEdit()` instance. Rather than refactor shared state, `SettingsPage`
instantiates its own `useProfileEdit()` and renders a self-contained
`ProfileEditModal` function component via `createPortal(…, document.body)`.
The modal uses `crud-overlay` / `crud-modal` vera.css classes (established in
Phase 0) for consistent styling.

### AuditLogPage: useAuditLogFilters Hook Integration

`AuditLogPage` is wired to `useAuditLogFilters(organizationId)` for live
pagination, filtering, and CSV export. The hook manages page state, filter
state, and the fetch lifecycle. The page renders a filter bar, paginated table,
and an inline event-detail side panel.

### ExportPage: Direct API Wiring

All three export actions (`handleExportScores`, `handleExportJurors`,
`handleDbExportConfirm`) are wired directly to `exportXLSX` / `fullExport`
API helpers — no intermediate hook layer needed for this page.

### EntryControlPage: Token CRUD + Revoke

Wired to `listEntryTokens`, `createEntryToken`, `revokeEntryToken` API
functions. `isDemoMode` prop disables all write actions. Token rows show
status badges (active / revoked / expired) computed from `expires_at`.

---

## Prototype Parity

All five pages implement 1:1 visual parity with the prototype sections listed
above. Sections that show `—` (dashes) for KPI values represent data that
is either not yet available via API or is intentionally deferred (e.g. PIN
lockout counters, session counts).

---

## Files Changed

### Created

- `src/admin/EntryControlPage.jsx`
- `src/admin/PinBlockingPage.jsx`
- `src/admin/AuditLogPage.jsx`
- `src/admin/ExportPage.jsx`
- `src/admin/SettingsPage.jsx`

### Modified

- `src/admin/layout/AdminLayout.jsx` — added 5 imports + 5 render branches
- `src/AdminPanel.jsx` — fixed broken import paths (legacy file, not in active use)

### Deleted

- `src/admin/pages/EntryControlPage.jsx`
- `src/admin/pages/AuditLogPage.jsx`
- `src/admin/pages/ExportPage.jsx`
- `src/admin/pages/OrgSettingsPage.jsx`
- `src/admin/settings/PinResetDialog.jsx`
- `src/admin/settings/AuditLogCard.jsx`
- `src/admin/settings/ExportBackupPanel.jsx`
