# Delete Organization Feature — Design Spec

**Date:** 2026-04-20
**Scope:** Super-admin-only hard delete of an organization with cascade, guarded by code-typing confirmation.

---

## Context

The OrganizationsPage (`src/admin/pages/OrganizationsPage.jsx`) is already gated behind `isSuper` — regular admins are redirected to overview before reaching it. The existing kebab menu offers: View, Edit, Manage Admins, Enable/Disable. This spec adds a **Delete Organization** item visible only to super admins (satisfied by the existing page guard).

---

## Requirements

- Super admin can permanently delete any organization from the kebab menu.
- Deletion cascades to all child data (periods, projects, jurors, scores, criteria, outcomes, audit logs) via existing `ON DELETE CASCADE` FK constraints — no extra cleanup needed.
- Confirmation requires the admin to type the org's `code` (e.g. `IEEE-APSSDC`) exactly (case-insensitive) before the Delete button activates.
- A DB-level audit log entry is written before the DELETE executes, capturing the org row as JSON.
- After deletion, the org list reloads and memberships are refreshed (in case the deleted org was the active org in another browser session).
- Errors surface inline in the modal, never as `window.alert`.

---

## DB Layer — `006_rpcs_admin.sql`

Add `rpc_admin_delete_organization` after the existing organization RPCs:

```sql
CREATE OR REPLACE FUNCTION rpc_admin_delete_organization(
  p_org_id UUID
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM _assert_super_admin();

  -- Capture org snapshot for audit before deletion
  INSERT INTO audit_logs (action, target_type, target_id, payload)
  SELECT 'delete_organization', 'organization', p_org_id,
         row_to_json(o)::jsonb
  FROM organizations o WHERE o.id = p_org_id;

  DELETE FROM organizations WHERE id = p_org_id;
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_admin_delete_organization(UUID) TO authenticated;
```

`_assert_super_admin()` already exists in `003_helpers_and_triggers.sql` and raises `'unauthorized'` for non-super-admins.

The migration must be applied to **both vera-prod and vera-demo** in the same step.

---

## API Layer

**`src/shared/api/admin/organizations.js`** — new export:

```js
export async function deleteOrganization(organizationId) {
  if (!organizationId) throw new Error("deleteOrganization: organizationId required");
  const { error } = await supabase.rpc("rpc_admin_delete_organization", {
    p_org_id: organizationId,
  });
  if (error) throw error;
}
```

**`src/shared/api/admin/index.js`** — add `deleteOrganization` to the re-export list.

**`src/shared/api/index.js`** — add `deleteOrganization` to the public surface re-export.

---

## Frontend — `OrganizationsPage.jsx`

### State (4 new variables, same pattern as toggleOrg)

```js
const [deleteOrg, setDeleteOrg] = useState(null);
const [deleteConfirmCode, setDeleteConfirmCode] = useState("");
const [deleteError, setDeleteError] = useState("");
const [deleteLoading, setDeleteLoading] = useState(false);
```

### Handler

```js
const handleDeleteOrg = useCallback(async () => {
  if (!deleteOrg?.id) return;
  setDeleteLoading(true);
  setDeleteError("");
  try {
    await deleteOrganization(deleteOrg.id);
    setMessage(`"${deleteOrg.code}" organization deleted.`);
    setDeleteOrg(null);
    await loadOrgs();
    refreshMemberships().catch(() => {});
  } catch (e) {
    setDeleteError(e?.message || "Could not delete organization.");
  } finally {
    setDeleteLoading(false);
  }
}, [deleteOrg, loadOrgs, refreshMemberships, setMessage]);
```

### Kebab Menu Item

Added after the existing `floating-menu-divider` / Enable+Disable button — a second divider separates it:

```jsx
<div className="floating-menu-divider" />
<button
  className="floating-menu-item danger"
  onMouseDown={(e) => runOrgMenuAction(e, () => {
    setDeleteOrg(org);
    setDeleteConfirmCode("");
    setDeleteError("");
  })}
>
  <Trash2 size={13} strokeWidth={2} />
  Delete Organization
</button>
```

`Trash2` imported from `lucide-react` alongside existing imports.

### Confirmation Modal

Placed next to the existing toggle modal in JSX:

```jsx
<Modal open={!!deleteOrg} onClose={() => setDeleteOrg(null)} size="sm">
  <h2 className="fs-title">Delete Organization</h2>

  {/* Red warning box */}
  <FbAlert variant="danger">
    <p style={{ textAlign: "justify", textJustify: "inter-word" }}>
      This will permanently delete <strong>{deleteOrg?.name}</strong>{" "}
      (<code>{deleteOrg?.code}</code>) and <strong>all associated data</strong>:
      evaluation periods, projects, jurors, scores, and audit logs.
      This action cannot be undone.
    </p>
  </FbAlert>

  {/* Code confirmation input */}
  <label style={{ display: "block", marginTop: 16, fontSize: 13, fontWeight: 600 }}>
    Type <code>{deleteOrg?.code}</code> to confirm
  </label>
  <input
    className={`fs-input${deleteError ? " error" : ""}`}
    value={deleteConfirmCode}
    onChange={(e) => { setDeleteConfirmCode(e.target.value); setDeleteError(""); }}
    placeholder={deleteOrg?.code}
    autoFocus
    autoComplete="off"
  />
  {deleteError && (
    <p className="crt-field-error">
      <AlertCircle size={12} strokeWidth={2} />{deleteError}
    </p>
  )}

  {/* Actions */}
  <div className="fs-actions" style={{ marginTop: 20 }}>
    <button className="fs-btn fs-btn-secondary" onClick={() => setDeleteOrg(null)}>
      Cancel
    </button>
    <button
      className="fs-btn fs-btn-danger"
      disabled={
        deleteLoading ||
        deleteConfirmCode.trim().toUpperCase() !== (deleteOrg?.code || "").toUpperCase()
      }
      onClick={handleDeleteOrg}
    >
      <AsyncButtonContent loading={deleteLoading} loadingText="Deleting…">
        Delete Organization
      </AsyncButtonContent>
    </button>
  </div>
</Modal>
```

---

## Error Handling

| Scenario | Behavior |
|---|---|
| RPC returns `'unauthorized'` | `deleteError` shown inline in modal |
| Network failure | Generic "Could not delete organization." inline |
| Org not found (already deleted) | RPC no-ops (audit INSERT finds 0 rows, DELETE 0 rows); UI reloads and modal closes |
| Active org deleted in another tab | `refreshMemberships()` resolves to a different active org on next page load |

---

## Out of Scope

- Soft delete / restore
- Deleting from a non-organizations page
- Preventing deletion of the currently active org (page-level guard is sufficient; deleting your own active org is valid for a super admin)
