// src/shared/api/admin/audit.js
// ============================================================
// Admin audit log functions (v2 — JWT-based auth, tenant-scoped).
// ============================================================

import { callAdminRpcV2, rethrowUnauthorized } from "../transport";

/**
 * Returns paginated audit log entries matching the given filters.
 * Scoped to the tenant identified by tenantId.
 *
 * @param {object}   filters                  - Filter parameters (all optional).
 * @param {string}   filters.tenantId         - Tenant UUID (required for v2).
 * @param {string}   [filters.startAt]         ISO timestamp lower bound.
 * @param {string}   [filters.endAt]           ISO timestamp upper bound.
 * @param {string[]} [filters.actorTypes]      Actor type filter.
 * @param {string[]} [filters.actions]         Action filter.
 * @param {string}   [filters.search]          Full-text search string.
 * @param {string}   [filters.searchDay]       Day filter (DD).
 * @param {string}   [filters.searchMonth]     Month filter (MM).
 * @param {string}   [filters.searchYear]      Year filter (YYYY).
 * @param {number}   [filters.limit=120]       Max rows to return.
 * @param {string}   [filters.beforeAt]        Cursor: before this timestamp.
 * @param {string}   [filters.beforeId]        Cursor: tiebreaker for beforeAt.
 * @returns {Promise<object[]>} Array of audit log rows.
 */
export async function adminListAuditLogs(filters) {
  let data;
  try {
    data = await callAdminRpcV2("rpc_admin_audit_list", {
      p_tenant_id:    filters?.tenantId    || null,
      p_start_at:     filters?.startAt     || null,
      p_end_at:       filters?.endAt       || null,
      p_actor_types:  filters?.actorTypes  || null,
      p_actions:      filters?.actions     || null,
      p_search:       filters?.search      || null,
      p_search_day:   filters?.searchDay   || null,
      p_search_month: filters?.searchMonth || null,
      p_search_year:  filters?.searchYear  || null,
      p_limit:        filters?.limit       || 120,
      p_before_at:    filters?.beforeAt    || null,
      p_before_id:    filters?.beforeId    || null,
    });
  } catch (error) {
    rethrowUnauthorized(error);
  }
  return data || [];
}
