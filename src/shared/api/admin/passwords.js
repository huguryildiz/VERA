// src/shared/api/admin/passwords.js
// ============================================================
// Operational password management.
//
// Phase C: adminLogin and adminBootstrapPassword are removed
// (replaced by Supabase Auth signIn/signUp).
//
// adminChangePassword kept as v1 legacy for AdminSecurityPanel.
//
// Retained: delete-password and backup-password operations.
// These use v1 RPCs (operational passwords are not yet
// tenant-scoped in the DB — deferred to Phase D).
// ============================================================

import { callAdminRpc } from "../transport";

/**
 * Changes the admin password (v1 legacy — used by AdminSecurityPanel).
 */
export async function adminChangePassword(currentPassword, newPassword) {
  const data = await callAdminRpc("rpc_admin_change_password", {
    p_current_password: currentPassword,
    p_new_password:     newPassword,
  });
  return data?.[0] || null;
}

/**
 * Sets the initial backup (export) password.
 */
export async function adminBootstrapBackupPassword(newPassword) {
  const data = await callAdminRpc("rpc_admin_bootstrap_backup_password", {
    p_new_password:   newPassword,
    p_admin_password: "",
  });
  return data === true;
}

/**
 * Sets the initial delete password.
 */
export async function adminBootstrapDeletePassword(newPassword) {
  const data = await callAdminRpc("rpc_admin_bootstrap_delete_password", {
    p_new_password:   newPassword,
    p_admin_password: "",
  });
  return data === true;
}

/**
 * Changes the backup (export) password.
 */
export async function adminChangeBackupPassword(currentPassword, newPassword) {
  const data = await callAdminRpc("rpc_admin_change_backup_password", {
    p_current_password: currentPassword,
    p_new_password:     newPassword,
    p_admin_password:   "",
  });
  return data === true;
}

/**
 * Changes the delete password.
 */
export async function adminChangeDeletePassword(currentPassword, newPassword) {
  const data = await callAdminRpc("rpc_admin_change_delete_password", {
    p_current_password: currentPassword,
    p_new_password:     newPassword,
    p_admin_password:   "",
  });
  return data === true || data?.[0] || null;
}
