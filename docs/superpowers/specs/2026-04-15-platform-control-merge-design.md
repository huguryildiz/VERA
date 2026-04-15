# Platform Control — Merge Unlock Requests into Organizations Page

**Date:** 2026-04-15
**Status:** Approved

## Summary

Merge the standalone `UnlockRequestsPage` into `OrganizationsPage`, rename the page to
"Platform Control", and clean up the now-redundant route and sidebar item.

## Goals

- Single super-admin hub for all platform-level operations
- Remove one sidebar item from the "Platform" section
- No behavior changes — only structural consolidation

## Page Structure

```
Platform Control                         ← page title + "Super Admin" badge

[ Organizations ]  [ Unlock Requests ]   ← top-level tab strip (new)

Tab: Organizations (default)
  KPI strip + governance action buttons
  Organizations table + all drawers (unchanged)

Tab: Unlock Requests
  [ Pending ] [ Approved ] [ Rejected ]  ← existing sub-tab strip (unchanged)
  Table + approve/reject modal
```

## Access Control

- Super-admin only — `!isSuper` → `<Navigate to="../overview" replace />`
- Sidebar item remains inside `{isSuper && (...)}` block

## Routing

| Route | After |
|---|---|
| `/admin/organizations` | Platform Control page (unchanged path) |
| `/admin/unlock-requests` | Removed; redirect → `../organizations` |

## File Changes

| File | Change |
|---|---|
| `src/admin/pages/OrganizationsPage.jsx` | Add `activeMainTab` state; absorb all Unlock Requests state, logic, and JSX from `UnlockRequestsPage`; rename page title to "Platform Control" |
| `src/admin/pages/UnlockRequestsPage.jsx` | **Delete** |
| `src/admin/layout/AdminSidebar.jsx` | Remove "Unlock Requests" `<button>`; rename "Organizations" label to "Platform Control"; update icon if needed |
| `src/router.jsx` | Remove `unlock-requests` lazy import + route; add `{ path: "unlock-requests", element: <Navigate to="../organizations" replace /> }` |
| `src/admin/hooks/useAdminNav.js` | Update `organizations` label → `"Platform Control"` |

## Tab State

- `activeMainTab: "organizations" | "unlock-requests"` — local component state, not in URL
- Default: `"organizations"`
- No deep-link requirement (page is super-admin only, no cross-link references found)

## What Does NOT Change

- All Unlock Requests business logic (load, sort, paginate, resolve modal)
- Organizations table, KPI strip, governance drawers
- Super-admin guard pattern
- Audit logging, API calls

## Out of Scope

- Styling of the tab strip (use existing tab pattern from `UnlockRequestsPage`)
- Any new features
