# Organization Admin Ownership Model

**Date:** 2026-04-22
**Status:** Design approved, pending implementation plan

## Problem

VERA's admin team feature currently treats every organization admin identically. There is no distinction between the person who set up the organization and admins they later invited, no way to restrict who can add new admins, and no way to transfer control when the original admin leaves. In practice this means any admin can add any number of other admins, and ownership is invisible to the platform.

We want:

1. The person who creates an organization is its **owner**.
2. Owner can invite additional admins. By default, non-owner admins cannot.
3. Owner can optionally flip a switch that lets other admins invite too (delegation / bus-factor mitigation).
4. Owner can transfer ownership to another active admin. After transfer, the former owner stays on the team as a regular admin.
5. Owner cannot leave the team without transferring ownership first.
6. Super-admin (platform level) remains the emergency fallback — can do anything.

## Current State (summary)

- `memberships` has `role` (`org_admin` / `super_admin`) and `status` (`active` / `invited` / `requested`). No owner flag.
- `organizations` has no `owner_id` or `creator_id`. Creator is only recorded in audit logs.
- Any `org_admin` can call `invite-org-admin` edge function and `rpc_org_admin_cancel_invite` RPC.
- `rpc_org_admin_list_members` returns `{id, user_id, status, created_at, display_name, email}` — no role differentiation.
- `AdminTeamCard` shows active + pending members with a placeholder kebab (no actions wired up).

## Design

### 1. Data Model

**`memberships` table:**

```sql
ALTER TABLE memberships ADD COLUMN is_owner boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX memberships_one_owner_per_org
  ON memberships(organization_id) WHERE is_owner = true;
```

Partial unique index enforces "at most one owner per organization" at the database level.

**`organizations.settings` JSONB gains one key:**

```json
{ "admins_can_invite": false }
```

Default when absent is treated as `false`. No new column; lives alongside existing settings.

**Backfill (one-time, in the migration that adds the column):**

```sql
UPDATE memberships m
SET is_owner = true
FROM (
  SELECT DISTINCT ON (organization_id) id
  FROM memberships
  WHERE status = 'active' AND role = 'org_admin' AND organization_id IS NOT NULL
  ORDER BY organization_id, created_at ASC
) earliest
WHERE m.id = earliest.id;
```

Heuristic: earliest active `org_admin` per org becomes the owner. Edge case (org with no active admins) → no owner; super-admin can assign one manually later.

### 2. Permission Model

Permission predicates (computed server-side in SQL helpers):

| Action | Predicate |
|---|---|
| Invite new admin | `is_owner OR settings.admins_can_invite = true` |
| Cancel pending invite | same as invite |
| Resend pending invite | same as invite |
| Remove active admin | `is_owner` only |
| Transfer ownership | `is_owner` only |
| Toggle `admins_can_invite` | `is_owner` only |
| Leave team (delete own membership) | non-owner only — owner must transfer first |

Super-admin (`_assert_super_admin()`) bypasses all of the above as emergency fallback.

### 3. RPC & Edge Function Changes

**New SQL helpers (`006_rpcs_admin.sql`):**

- `_assert_tenant_owner(p_org_id)` — raises if caller is not owner of the given org
- `_assert_can_invite(p_org_id)` — raises if caller is neither owner nor admin-with-invite-setting-on

**New RPCs:**

- `rpc_org_admin_transfer_ownership(p_target_membership_id uuid)`
  - Caller must be owner
  - Target must be in same org, `status = 'active'`, `role = 'org_admin'`, `is_owner = false`
  - Atomically: unset caller's `is_owner`, set target's `is_owner = true`
  - Returns `{ ok: true, new_owner_user_id }`
  - Writes audit log entry (`action = 'org.ownership.transfer'`)

- `rpc_org_admin_remove_member(p_membership_id uuid)`
  - Caller must be owner
  - Target must be in same org, `is_owner = false`
  - Deletes the membership row
  - Returns `{ ok: true, membership_id }`
  - Writes audit log entry (`action = 'org.admin.remove'`)

- `rpc_org_admin_set_admins_can_invite(p_org_id uuid, p_enabled boolean)`
  - Caller must be owner of `p_org_id`
  - Updates `organizations.settings->>'admins_can_invite'`
  - Returns `{ ok: true, enabled: boolean }`
  - Writes audit log entry (`action = 'org.settings.admins_can_invite'`)

**Modified RPCs:**

- `rpc_org_admin_list_members` — response gains two fields per row:
  - `is_owner boolean`
  - `is_you boolean` (computed: `user_id = auth.uid()`)

- `rpc_org_admin_cancel_invite` — caller check changes from `_assert_tenant_admin` to `_assert_can_invite`

**Modified edge function:**

- `invite-org-admin` — caller-authorization check changes from "must be org_admin member" to `_assert_can_invite`. Both the edge function's in-memory check and the underlying insert RPC (if used) apply the new rule.

### 4. API Layer (`src/shared/api/admin/organizations.js`)

New functions exported through `src/shared/api/index.js`:

- `transferOwnership(targetMembershipId)` → calls `rpc_org_admin_transfer_ownership`
- `removeOrgAdmin(membershipId)` → calls `rpc_org_admin_remove_member`
- `setAdminsCanInvite(orgId, enabled)` → calls `rpc_org_admin_set_admins_can_invite`

Modified:

- `listOrgAdminMembers` — `mapMembers` in `useAdminTeam.js` maps the new `is_owner` / `is_you` fields.

### 5. UI Changes

**AdminTeamCard — member row:**

- Owner rows show a `Owner` pill next to the name (Crown icon, accent/gold tone).
- Current user's row shows a `You` pill (already exists).
- If a user is both owner and current viewer, both pills render side by side.

**Kebab menu visibility:**

| Viewer is | Target is | Menu items |
|---|---|---|
| Owner | Self | *(no kebab)* |
| Owner | Active admin | Transfer ownership · Remove from team |
| Owner | Pending invite | Resend invite · Cancel invite |
| Admin (can invite) | Pending invite | Resend · Cancel |
| Admin (can invite) | Active admin | *(no kebab — remove is owner-only)* |
| Admin (cannot invite) | Anyone | *(no kebab)* |

**Invite Admin button:**

- Visible only when `canInvite` is true (no disabled state — simply not rendered).
- When an admin is on the page but cannot invite, a small info note appears in the card header area: *"Only the owner can invite new admins."*

**Admins-can-invite toggle (visible to owner only):**

- Renders below the Invite Admin form area (or in card header's right side).
- Label: "Allow admins to invite other admins"
- Helper: "When on, other admins can invite new admins. You always can."
- Toggles `organizations.settings.admins_can_invite` via `setAdminsCanInvite` RPC.

**Transfer ownership flow:**

- Inline confirm panel within the card (follows drawer inline-confirm pattern from CLAUDE.md):
  - Message: *"Transfer ownership to {name}? You'll become a regular admin."*
  - Confirm button: "Transfer ownership"
- On success: toast `"Ownership transferred"` + refetch members list.

**Remove member flow:**

- Inline confirm panel:
  - Message: *"Remove {name} from the admin team? They'll lose access immediately."*
  - Confirm button: "Remove"
- On success: toast `"Admin removed"` + refetch.

### 6. Migration & Rollout

- All SQL changes land in existing module files per the migration policy: schema → `002_tables.sql`, RPCs → `006_rpcs_admin.sql`.
- Applied to both `vera-prod` and `vera-demo` in the same step via Supabase MCP.
- Backfill UPDATE is idempotent (safe to re-run; only affects rows where `is_owner = false` for the earliest active admin per org).
- Edge function `invite-org-admin` redeployed to both projects.

### 7. Testing

**SQL-level (manual via MCP):**
- Fresh seed → verify each seeded org has exactly one owner
- Transfer ownership → verify partial unique index holds, audit log entry exists
- Remove member → verify owner cannot be removed, non-owner can
- Toggle setting → verify predicate flips for non-owner admin

**Frontend unit tests:**
- `useAdminTeam` maps `is_owner` / `is_you` correctly
- `AdminTeamCard` renders Owner pill only on owner rows
- Kebab menu visibility matches the matrix above

**E2E (Playwright):**
- Owner invites admin → admin appears in pending → admin accepts → admin active
- Owner transfers ownership → former owner loses owner pill, target gains it
- Non-owner admin with invite-off sees no Invite button
- Non-owner admin with invite-on sees Invite button, can invite, cannot remove

## Out of Scope

- Multi-level role hierarchies (owner + co-owner + admin + viewer). If that becomes needed, a follow-up spec can replace the `role` enum with a richer set.
- Billing or usage tied to owner (no billing module exists yet).
- Invite expiry / per-invite TTL changes (current invite system stays as-is).
- Bulk admin management (import CSV, SSO auto-provision, etc.).
- Super-admin UI for manually assigning ownership when an org has no owner (rare edge case; handled via direct SQL for now).
