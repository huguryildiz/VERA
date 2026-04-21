# Admin Team — Settings Page Design

**Date:** 2026-04-21
**Scope:** Tenant org admin Settings page — invite, view, and manage co-admins

---

## Problem

Org admins cannot currently invite or manage co-admins from their own Settings page. The only invite surface is the OrganizationsPage (super-admin only). Org admins need self-service team management without super-admin involvement.

---

## Decision Summary

| Question | Decision |
|---|---|
| Scope | Full team management: active list, pending list, invite, resend, cancel |
| Layout | Full-width card **below** the existing 2-column grid |
| Invite form | Toggle — `+ Invite Admin` button reveals inline dashed form |
| Pending actions | Resend + Cancel |
| Active actions | Kebab `⋯` (empty now; "Remove" in future) |
| Visibility | Org admin only (`!isSuper`) |
| New API needed | Yes — one new RPC + one new API wrapper (see below) |

---

## File Changes

| File | Change |
|---|---|
| `sql/migrations/006_rpcs_admin.sql` | Add `rpc_org_admin_list_members` RPC |
| `src/shared/api/admin/organizations.js` | Add `listOrgAdminMembers()` wrapper |
| `src/shared/api/admin/index.js` + `src/shared/api/index.js` | Export `listOrgAdminMembers` |
| `src/admin/hooks/useAdminTeam.js` | New — data + actions hook |
| `src/admin/components/AdminTeamCard.jsx` | New — UI component |
| `src/admin/pages/SettingsPage.jsx` | Add hook call + `<AdminTeamCard>` render |

---

## `useAdminTeam(orgId)` Hook

**Location:** `src/admin/hooks/useAdminTeam.js`

**Returns:**

```js
{
  members,         // Member[]
  loading,         // boolean
  error,           // string | null
  inviteForm,      // { open, email, submitting, error }
  openInviteForm,  // () => void
  closeInviteForm, // () => void
  setInviteEmail,  // (email: string) => void
  sendInvite,      // () => Promise<void> — uses inviteForm.email
  resendInvite,    // (membershipId, email) => Promise<void>
  cancelInvite,    // (membershipId) => Promise<void>
}
```

**Member shape:**

```js
{
  id: string,           // membership id
  userId: string | null,
  email: string,
  displayName: string | null,
  status: 'active' | 'invited',
  joinedAt: string | null,
  invitedAt: string | null,
}
```

**Data fetching:**
- Calls `listOrgAdminMembers()` (new — see RPC below)
- Fetched on mount; refetched after every mutating action
- `orgId` guard: if `orgId` is null/undefined (e.g. super admin), hook returns `{ members: [], loading: false }` immediately without fetching

**Actions:**
- `sendInvite()` — calls `inviteOrgAdmin(orgId, email)`; handles `status: 'invited' | 'reinvited' | 'added'` for toast message; clears + closes form on success
- `resendInvite(membershipId, email)` — calls `inviteOrgAdmin(orgId, email)` again (same email → `status: 'reinvited'`); shows success toast
- `cancelInvite(membershipId)` — calls `cancelOrgAdminInvite(membershipId)`; refetches list

**Error handling:** Action errors surface as `inviteForm.error` (invite) or via `useToast` (resend/cancel).

---

## `AdminTeamCard` Component

**Location:** `src/admin/components/AdminTeamCard.jsx`

**Props:**

```js
{
  members,
  loading,
  error,
  inviteForm,
  openInviteForm,
  closeInviteForm,
  setInviteEmail,
  sendInvite,
  resendInvite,
  cancelInvite,
  currentUserId,  // to disable actions on own row
}
```

**Layout:**

```
┌─────────────────────────────────────────────────┐
│ Admin Team   · 2 active · 1 pending   [+ Invite] │
│                                                   │
│ ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐  │
│   INVITE NEW ADMIN                               │
│   [email input________________] [Send] [✕]      │
│ └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘  │
│                                                   │
│ ACTIVE (2)                                        │
│  [AJ] Alice Johnson  alice@uni.edu  ● Active  [⋯] │
│  [BS] Bob Smith      bob@uni.edu    ● Active  [⋯] │
│                                                   │
│ PENDING (1)                                       │
│  [?]  carol@uni.edu  ⏳ Pending  [Resend][Cancel] │
└─────────────────────────────────────────────────┘
```

**Behavior:**
- Loading state: skeleton rows (3 placeholder rows)
- Error state: `<FbAlert variant="danger">` with message
- Empty state (0 members, unlikely): neutral copy "No admins yet"
- Active sections rendered only when count > 0
- Current user's own row: kebab disabled, no Resend/Cancel buttons
- Invite form: `<input className="…">` with `error` class + `<p className="crt-field-error">` on validation error
- All icons from `lucide-react` (UserPlus for invite button, MoreVertical for kebab, MailOpen for resend, X for cancel/close)

---

## SettingsPage Integration

Add after the closing `</div>` of the `grid-2` div:

```jsx
{!isSuper && (
  <AdminTeamCard
    {...adminTeam}
    currentUserId={user?.id}
  />
)}
```

Where `adminTeam = useAdminTeam(activeOrganization?.id)` is called at the top of SettingsPage.

---

## New RPC: `rpc_org_admin_list_members`

**Migration file:** `sql/migrations/006_rpcs_admin.sql`

**Why needed:** The `memberships_select` RLS policy only allows `user_id = auth.uid()` (own row) or super-admin. Org admins cannot read co-members via PostgREST without a SECURITY DEFINER bypass.

**Spec:**

```sql
CREATE OR REPLACE FUNCTION public.rpc_org_admin_list_members()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_org_id UUID;
BEGIN
  SELECT organization_id INTO v_org_id
  FROM memberships
  WHERE user_id = auth.uid() AND status = 'active'
  LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  RETURN (
    SELECT json_agg(
      jsonb_build_object(
        'id',           m.id,
        'user_id',      m.user_id,
        'status',       m.status,
        'created_at',   m.created_at,
        'display_name', p.display_name,
        'email',        u.email
      )
    )
    FROM memberships m
    LEFT JOIN profiles p   ON p.id = m.user_id
    LEFT JOIN auth.users u ON u.id = m.user_id
    WHERE m.organization_id = v_org_id
      AND m.status IN ('active', 'invited')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_org_admin_list_members() TO authenticated;
```

**API wrapper** (`src/shared/api/admin/organizations.js`):

```js
export async function listOrgAdminMembers() {
  const { data, error } = await supabase.rpc("rpc_org_admin_list_members");
  if (error) throw error;
  return data || [];
}
```

---

## Permissions & Security

- Component only rendered when `!isSuper`
- `rpc_org_admin_cancel_invite` uses `_assert_org_admin()` server-side — unauthorized calls rejected at DB level
- `invite-org-admin` Edge Function similarly validates org membership
- Current user's own row has actions disabled client-side (belt-and-suspenders UX, not a security boundary)

---

## Out of Scope (this iteration)

- Remove active admin (kebab `⋯` stub present, action not wired)
- Email validation beyond basic format check
- Pagination (org admin teams expected to be small, <20 rows)
- Role levels beyond org admin (single role per org for now)
