import { describe, expect, vi, beforeEach, afterEach } from "vitest";
import { qaTest } from "../../../test/qaTest.js";

// supabaseClient uses import.meta.env and createClient — mock both before importing
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn((url, key) => ({
    _url: url,
    _key: key,
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

describe("supabaseClient", () => {
  let originalWindow;

  beforeEach(() => {
    originalWindow = global.window;
    global.window = { location: { pathname: "/admin" } };
    vi.resetModules();
  });

  afterEach(() => {
    global.window = originalWindow;
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
    const { clearPersistedSession } = await import("../supabaseClient.js");

    // Simulate unavailable localStorage
    const originalLocalStorage = global.localStorage;
    Object.defineProperty(global, "localStorage", {
      value: {
        removeItem: vi.fn(() => { throw new Error("Storage unavailable"); }),
        keys: () => [],
      },
      configurable: true,
    });

    expect(() => clearPersistedSession()).not.toThrow();

    Object.defineProperty(global, "localStorage", {
      value: originalLocalStorage,
      configurable: true,
    });
  });
});
