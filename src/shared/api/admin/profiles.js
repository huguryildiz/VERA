// src/shared/api/admin/profiles.js
// ============================================================
// Admin profile functions (v2 — JWT-based auth).
// ============================================================

import { callAdminRpcV2 } from "../transport";

/**
 * Upserts the calling user's admin profile.
 * Creates a profile on first call; subsequent calls update display_name
 * only if a non-empty value is provided.
 *
 * @param {string} [displayName]  Optional display name override.
 * @returns {Promise<{user_id: string, display_name: string|null}>}
 */
export async function adminProfileUpsert(displayName) {
  const params = {};
  if (displayName != null) params.p_display_name = displayName;
  const data = await callAdminRpcV2("rpc_admin_profile_upsert", params);
  return data?.[0] || null;
}

/**
 * Returns the calling user's admin profile.
 *
 * @returns {Promise<{user_id: string, display_name: string|null}|null>}
 */
export async function adminProfileGet() {
  const data = await callAdminRpcV2("rpc_admin_profile_get");
  return data?.[0] || null;
}
