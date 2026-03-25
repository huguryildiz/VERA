// src/shared/api/admin/tenants.js
// ============================================================
// Admin tenant/organization management functions (v2 — JWT-based auth).
// Super-admin only — all RPCs call _assert_super_admin().
//
// Field mapping: the DB column is `short_label`, and the client
// also uses `shortLabel` for clarity. Mapping happens here at the
// API boundary so components never see raw DB column names.
// ============================================================

import { callAdminRpcV2 } from "../transport";

/**
 * @typedef {object} TenantRow
 * @property {string}  id          UUID primary key.
 * @property {string}  code        Immutable tenant code (e.g. "tedu-ee").
 * @property {string}  shortLabel  Short UI label (mapped from DB `short_label`).
 * @property {string}  university  Official university name.
 * @property {string}  department  Official department name.
 * @property {string}  status      Lifecycle state: active | disabled | archived.
 * @property {string}  created_at  ISO timestamp.
 * @property {string}  updated_at  ISO timestamp.
 */

/**
 * Maps a raw RPC row (with `short_label`) to client shape (with `shortLabel`).
 * @param {object} row
 * @returns {TenantRow}
 */
function mapRow(row) {
  return { ...row, shortLabel: row.short_label };
}

/**
 * Sort comparator: code ascending (case-insensitive).
 */
function byCodeAsc(a, b) {
  return a.code.localeCompare(b.code);
}

/**
 * Lists all tenants. Super-admin only.
 * Returns rows sorted by `code` ascending.
 * @returns {Promise<TenantRow[]>}
 */
export async function adminListTenants() {
  const data = await callAdminRpcV2("rpc_admin_tenant_list");
  return (data || []).map(mapRow).sort(byCodeAsc);
}

/**
 * Creates a new tenant. Super-admin only.
 * @param {{ code: string, shortLabel: string, university: string, department: string }} payload
 * @returns {Promise<string>} The new tenant's UUID.
 */
export async function adminCreateTenant(payload) {
  return callAdminRpcV2("rpc_admin_tenant_create", {
    p_code:       payload.code,
    p_short_label: payload.shortLabel,
    p_university:  payload.university,
    p_department:  payload.department,
  });
}

/**
 * Updates a tenant's identity and/or status. Super-admin only.
 * Pass only the fields you want to change; others default to NULL
 * (RPC uses COALESCE to keep existing values).
 * @param {{ tenantId: string, shortLabel?: string, university?: string, department?: string, status?: string }} payload
 * @returns {Promise<boolean>}
 */
export async function adminUpdateTenant(payload) {
  const data = await callAdminRpcV2("rpc_admin_tenant_update", {
    p_tenant_id:   payload.tenantId,
    p_short_label: payload.shortLabel ?? null,
    p_university: payload.university ?? null,
    p_department: payload.department ?? null,
    p_status:     payload.status ?? null,
  });
  return data === true;
}
