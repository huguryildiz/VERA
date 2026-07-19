import { describe, expect, vi, beforeEach, afterEach } from "vitest";
import { qaTest } from "../../../test/qaTest.js";
import { createClient } from "@supabase/supabase-js";
import { KEYS } from "../../storage/keys.js";

// supabaseClient uses import.meta.env and createClient — mock both before importing
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn((url, key, options) => ({
    _url: url,
    _key: key,
    _options: options,
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    from: vi.fn().mockReturnThis(),
    auth: {
      getUser: vi.fn(),
      getSession: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
  })),
}));

function makeStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: vi.fn((key) => values.get(key) ?? null),
    setItem: vi.fn((key, value) => values.set(key, String(value))),
    removeItem: vi.fn((key) => values.delete(key)),
    clear: vi.fn(() => values.clear()),
  };
}

describe("supabaseClient", () => {
  let originalWindow;
  let originalLocalStorage;
  let originalSessionStorage;

  beforeEach(() => {
    originalWindow = global.window;
    originalLocalStorage = global.localStorage;
    originalSessionStorage = global.sessionStorage;
    global.window = { location: { pathname: "/admin" } };
    Object.defineProperty(global, "localStorage", {
      value: makeStorage(),
      configurable: true,
    });
    Object.defineProperty(global, "sessionStorage", {
      value: makeStorage(),
      configurable: true,
    });
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    global.window = originalWindow;
    Object.defineProperty(global, "localStorage", {
      value: originalLocalStorage,
      configurable: true,
    });
    Object.defineProperty(global, "sessionStorage", {
      value: originalSessionStorage,
      configurable: true,
    });
    vi.resetModules();
  });

  qaTest("lib.supabase.01", async () => {
    const { supabase } = await import("../supabaseClient.js");
    // Proxy must forward method calls to the underlying client
    expect(typeof supabase.rpc).toBe("function");
    expect(typeof supabase.from).toBe("function");
  });

  qaTest("lib.supabase.02", async () => {
    const { supabase } = await import("../supabaseClient.js");
    // Calling rpc through the proxy must not throw a binding error
    await expect(supabase.rpc("test_rpc")).resolves.toBeDefined();
  });

  qaTest("lib.supabase.03", async () => {
    const { createAuthStorageAdapter } = await import("../supabaseClient.js");
    const adapter = createAuthStorageAdapter();
    localStorage.setItem("sb-test-auth-token", "local-token");
    sessionStorage.setItem("sb-test-auth-token", "session-token");

    expect(() => adapter.removeItem("sb-test-auth-token")).not.toThrow();
    expect(localStorage.getItem("sb-test-auth-token")).toBeNull();
    expect(sessionStorage.getItem("sb-test-auth-token")).toBeNull();
  });

  qaTest("lib.supabase.04", async () => {
    const { createAuthStorageAdapter } = await import("../supabaseClient.js");
    localStorage.setItem(KEYS.ADMIN_REMEMBER_ME, "false");
    const adapter = createAuthStorageAdapter();

    adapter.setItem("sb-test-auth-token", "session-token");

    expect(sessionStorage.getItem("sb-test-auth-token")).toBe("session-token");
    expect(localStorage.getItem("sb-test-auth-token")).toBeNull();
    expect(adapter.getItem("sb-test-auth-token")).toBe("session-token");
  });

  qaTest("lib.supabase.05", async () => {
    const { createAuthStorageAdapter } = await import("../supabaseClient.js");
    localStorage.setItem(KEYS.ADMIN_REMEMBER_ME, "true");
    const adapter = createAuthStorageAdapter();

    adapter.setItem("sb-test-auth-token", "persistent-token");

    expect(localStorage.getItem("sb-test-auth-token")).toBe("persistent-token");
    expect(sessionStorage.getItem("sb-test-auth-token")).toBeNull();
    expect(adapter.getItem("sb-test-auth-token")).toBe("persistent-token");
  });

  qaTest("lib.supabase.06", async () => {
    const { createAuthStorageAdapter } = await import("../supabaseClient.js");
    const adapter = createAuthStorageAdapter();

    adapter.setItem("sb-test-auth-token", "legacy-token");

    expect(localStorage.getItem("sb-test-auth-token")).toBe("legacy-token");
    expect(sessionStorage.getItem("sb-test-auth-token")).toBeNull();
  });

  qaTest("lib.supabase.07", async () => {
    const { createAuthStorageAdapter } = await import("../supabaseClient.js");
    localStorage.setItem(KEYS.ADMIN_REMEMBER_ME, "false");
    localStorage.setItem("sb-test-auth-token", "migrating-token");
    const adapter = createAuthStorageAdapter();

    expect(adapter.getItem("sb-test-auth-token")).toBe("migrating-token");
    expect(sessionStorage.getItem("sb-test-auth-token")).toBe("migrating-token");
    expect(localStorage.getItem("sb-test-auth-token")).toBeNull();

    localStorage.setItem(KEYS.ADMIN_REMEMBER_ME, "true");
    expect(adapter.getItem("sb-test-auth-token")).toBe("migrating-token");
    expect(localStorage.getItem("sb-test-auth-token")).toBe("migrating-token");
    expect(sessionStorage.getItem("sb-test-auth-token")).toBeNull();
  });

  qaTest("lib.supabase.08", async () => {
    const { supabase, getDemoClient } = await import("../supabaseClient.js");

    void supabase.auth;
    getDemoClient();

    expect(createClient).toHaveBeenCalledTimes(2);
    for (const [, , options] of createClient.mock.calls) {
      expect(options.auth.persistSession).toBe(true);
      expect(options.auth.storage).toEqual(expect.objectContaining({
        getItem: expect.any(Function),
        setItem: expect.any(Function),
        removeItem: expect.any(Function),
      }));
    }
  });

  qaTest("lib.supabase.09", async () => {
    const { createAuthStorageAdapter } = await import("../supabaseClient.js");
    const unavailable = {
      getItem: vi.fn(() => { throw new Error("Storage unavailable"); }),
      setItem: vi.fn(() => { throw new Error("Storage unavailable"); }),
      removeItem: vi.fn(() => { throw new Error("Storage unavailable"); }),
    };
    Object.defineProperty(global, "localStorage", { value: unavailable, configurable: true });
    Object.defineProperty(global, "sessionStorage", { value: unavailable, configurable: true });
    const adapter = createAuthStorageAdapter();

    expect(() => adapter.setItem("sb-test-auth-token", "memory-token")).not.toThrow();
    expect(adapter.getItem("sb-test-auth-token")).toBe("memory-token");
    expect(() => adapter.removeItem("sb-test-auth-token")).not.toThrow();
    expect(adapter.getItem("sb-test-auth-token")).toBeNull();
  });
});
