// src/shared/api/transport.js
// ============================================================
// Internal transport layer for admin RPC calls.
// NOT part of the public API surface — consumed only by
// domain modules in src/shared/api/admin/.
//
// v1: callAdminRpc — password-based auth (legacy, will be deprecated).
// v2: callAdminRpcV2 — JWT-based auth via Supabase Auth.
//     RPCs use rpc_admin_* naming (cleaned from rpc_v2_admin_*).
// ============================================================

import { supabase } from "./core/client";
import {
  RPC_PROXY_URL,
  USE_PROXY,
  DEV_RPC_SECRET,
} from "./core/client";

// ── Proxy dispatcher ──────────────────────────────────────────
// Production: calls rpc-proxy Edge Function (p_rpc_secret injected server-side).
// Dev:        calls Supabase RPC directly with client-side VITE_RPC_SECRET.
export async function callAdminRpc(fn, params = {}) {
  if (USE_PROXY) {
    const res = await fetch(RPC_PROXY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey:        import.meta.env.VITE_SUPABASE_ANON_KEY ?? "",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY ?? ""}`,
      },
      body: JSON.stringify({ fn, params }),
    });
    const json = await res.json();
    if (!res.ok || json.error) {
      const err = new Error(json.error || "Admin RPC proxy error");
      err.code = json.code;
      throw err;
    }
    return json.data;
  }
  // Dev fallback: direct Supabase RPC with client-side secret
  const { data, error } = await supabase.rpc(fn, {
    ...params,
    p_rpc_secret: DEV_RPC_SECRET,
  });
  if (error) throw error;
  return data;
}

// ── v2 Proxy dispatcher (JWT-based auth) ────────────────────
// Production: sends client's JWT to rpc-proxy (which forwards it via anon-key client).
// Dev:        direct Supabase RPC — JWT sent automatically by authenticated client.
// No p_rpc_secret or p_admin_password.
export async function callAdminRpcV2(fn, params = {}) {
  if (USE_PROXY) {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token ?? "";
    const res = await fetch(RPC_PROXY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey:        import.meta.env.VITE_SUPABASE_ANON_KEY ?? "",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ fn, params }),
    });
    const json = await res.json();
    if (!res.ok || json.error) {
      const err = new Error(json.error || "Admin RPC v2 proxy error");
      err.code = json.code;
      throw err;
    }
    return json.data;
  }
  // Dev: direct RPC — JWT sent automatically by authenticated Supabase client
  const { data, error } = await supabase.rpc(fn, params);
  if (error) throw error;
  return data;
}

// ── Auth error normalizer ─────────────────────────────────────
// Re-thrown as `e.unauthorized = true` for consistent handling across admin tabs.
//
// Primary check: error.code === "P0401" — the SQLSTATE used by all admin
// password-validation failures in the DB (sql/000_bootstrap.sql).
//
// Fallback: error.message === "unauthorized" — exact match for the DB
// exception string, handles cases where the proxy does not forward the code
// (e.g., a network-level error wraps the response). Exact equality prevents
// false positives from unrelated P0401 errors (e.g., juror session errors).
export function rethrowUnauthorized(error) {
  if (error.code === "P0401" || error.message === "unauthorized") {
    const e = new Error("unauthorized");
    e.unauthorized = true;
    throw e;
  }
  throw error;
}
