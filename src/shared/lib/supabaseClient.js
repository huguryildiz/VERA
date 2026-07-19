// src/shared/lib/supabaseClient.js
// Proxy-based Supabase client factory.
// Creates separate clients for prod and demo environments.
// The exported `supabase` is a Proxy that transparently delegates
// every property access / method call to the active environment's client.
// All existing consumers (`supabase.rpc(...)`, `supabase.from(...)`, etc.)
// work unchanged — the Proxy routes to the correct backend at runtime.

import { createClient } from "@supabase/supabase-js";
import { resolveEnvironment } from "./environment";
import { KEYS } from "@/shared/storage/keys";

const CONFIGS = {
  prod: {
    url: import.meta.env.VITE_SUPABASE_URL,
    key: import.meta.env.VITE_SUPABASE_ANON_KEY,
  },
  demo: {
    url: import.meta.env.VITE_DEMO_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL,
    key: import.meta.env.VITE_DEMO_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY,
  },
};

/** @type {Record<string, import('@supabase/supabase-js').SupabaseClient>} */
const clients = {};

function getBrowserStorage(name) {
  try {
    return globalThis?.[name] || null;
  } catch {
    return null;
  }
}

function readStorage(storage, key) {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function writeStorage(storage, key, value) {
  try {
    if (!storage) return false;
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function removeStorage(storage, key) {
  try {
    storage?.removeItem(key);
  } catch {
    // Storage can be unavailable in privacy modes. Supabase must still be
    // able to fall back to the adapter's in-memory copy.
  }
}

/**
 * Supabase Auth storage that implements the Remember Me contract without
 * deleting the SDK's active session:
 *   - preference === "false" → sessionStorage (survives OAuth redirect/reload,
 *     expires when the browser tab/window closes)
 *   - preference === "true" or missing → localStorage (legacy-compatible)
 *
 * The adapter is evaluated on every operation because the preference is set
 * immediately before sign-in. When the preference changes, a session found in
 * the alternate store is migrated to the selected store atomically enough for
 * the browser storage APIs: write selected first, then remove alternate.
 */
export function createAuthStorageAdapter() {
  const memoryFallback = new Map();

  function resolveStores() {
    const local = getBrowserStorage("localStorage");
    const session = getBrowserStorage("sessionStorage");
    const remember = readStorage(local, KEYS.ADMIN_REMEMBER_ME) !== "false";
    return remember
      ? { selected: local, alternate: session }
      : { selected: session, alternate: local };
  }

  return {
    getItem(key) {
      const { selected, alternate } = resolveStores();
      const selectedValue = readStorage(selected, key);
      if (selectedValue !== null) {
        memoryFallback.set(key, selectedValue);
        removeStorage(alternate, key);
        return selectedValue;
      }

      const alternateValue = readStorage(alternate, key);
      if (alternateValue !== null) {
        memoryFallback.set(key, alternateValue);
        if (writeStorage(selected, key, alternateValue)) {
          removeStorage(alternate, key);
        }
        return alternateValue;
      }

      return memoryFallback.get(key) ?? null;
    },

    setItem(key, value) {
      const { selected, alternate } = resolveStores();
      memoryFallback.set(key, value);
      if (writeStorage(selected, key, value)) {
        removeStorage(alternate, key);
      } else {
        // If the preferred browser store is unavailable, keep auth functional
        // using the other store when possible (and memory as the final fallback).
        writeStorage(alternate, key, value);
      }
    },

    removeItem(key) {
      const local = getBrowserStorage("localStorage");
      const session = getBrowserStorage("sessionStorage");
      memoryFallback.delete(key);
      removeStorage(local, key);
      removeStorage(session, key);
    },
  };
}

function createConfiguredClient(cfg) {
  return createClient(cfg.url, cfg.key, {
    auth: {
      persistSession: true,
      storage: createAuthStorageAdapter(),
    },
  });
}

function getClient() {
  const env = resolveEnvironment();
  if (!clients[env]) {
    const cfg = CONFIGS[env];
    clients[env] = createConfiguredClient(cfg);
  }
  return clients[env];
}

/**
 * Direct access to the demo Supabase client (lazy-created).
 * Used by LandingPage to avoid creating a duplicate GoTrueClient.
 */
export function getDemoClient() {
  if (!clients.demo) {
    const cfg = CONFIGS.demo;
    clients.demo = createConfiguredClient(cfg);
  }
  return clients.demo;
}

export const supabase = new Proxy(
  {},
  {
    get(_, prop) {
      const target = getClient();
      const value = target[prop];
      if (typeof value === "function") return value.bind(target);
      return value;
    },
  },
);
