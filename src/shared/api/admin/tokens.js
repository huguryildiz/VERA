// src/shared/api/admin/tokens.js
// ============================================================
// Admin jury entry token management functions (v2 — JWT-based).
// ============================================================

import { callAdminRpcV2, rethrowUnauthorized } from "../transport";

/**
 * Generates a new jury entry token for a semester.
 */
export async function adminGenerateEntryToken(semesterId) {
  try {
    const rows = await callAdminRpcV2("rpc_admin_entry_token_generate", {
      p_semester_id: semesterId,
    });
    return rows?.[0]?.raw_token || null;
  } catch (e) { rethrowUnauthorized(e); throw e; }
}

/**
 * Revokes the active jury entry token for a semester.
 */
export async function adminRevokeEntryToken(semesterId) {
  try {
    await callAdminRpcV2("rpc_admin_entry_token_revoke", {
      p_semester_id: semesterId,
    });
    return true;
  } catch (e) { rethrowUnauthorized(e); throw e; }
}

/**
 * Returns the current entry token status for a semester.
 */
export async function adminGetEntryTokenStatus(semesterId) {
  try {
    const rows = await callAdminRpcV2("rpc_admin_entry_token_status", {
      p_semester_id: semesterId,
    });
    return rows?.[0] || null;
  } catch (e) { rethrowUnauthorized(e); throw e; }
}
