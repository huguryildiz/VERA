import { vi } from "vitest";

/**
 * Build a chainable Supabase query mock.
 * Each method returns `this` for chaining; the final call (select, insert, etc.)
 * returns a Promise resolving to { data, error }.
 *
 * Usage in vi.mock:
 *   vi.mock("@/shared/lib/supabaseClient", () => ({
 *     supabase: makeMockSupabase(),
 *   }));
 */
export function makeMockSupabase({ data = null, error = null } = {}) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error }),
    then: undefined,
  };

  // Make the chain itself thenable so `await supabase.from().select()` works
  chain.select = vi.fn(() => Promise.resolve({ data, error }));

  const rpc = vi.fn().mockResolvedValue({ data, error });

  return {
    from: vi.fn(() => chain),
    rpc,
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  };
}
