// src/admin/shared/e2eVisibility.js
// ============================================================
// Toggle for showing E2E test fixture organizations / jurors in
// the demo super-admin UI. Default: hidden so customer demos stay
// clean. Override via ?showE2E=1 query param (one-shot) or the
// "Show E2E test data" switch in Settings (persists in localStorage).
// E2E test runs target the same demo project but bypass this toggle
// because they hit RPCs directly with their own super-admin context.
// ============================================================

import { KEYS } from "@/shared/storage/keys";

const E2E_CODE_PREFIX = "E2E-";

export function shouldShowE2EFixtures() {
  try {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("showE2E") === "1") return true;
    }
    return localStorage.getItem(KEYS.ADMIN_SHOW_E2E_FIXTURES) === "1";
  } catch {
    return false;
  }
}

export function setShowE2EFixtures(show) {
  try {
    if (show) localStorage.setItem(KEYS.ADMIN_SHOW_E2E_FIXTURES, "1");
    else localStorage.removeItem(KEYS.ADMIN_SHOW_E2E_FIXTURES);
  } catch { /* storage unavailable — ignore */ }
}

export function isE2ECode(code) {
  return String(code ?? "").startsWith(E2E_CODE_PREFIX);
}
