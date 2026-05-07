import { describe, expect, beforeEach, afterEach, vi } from "vitest";
import { qaTest } from "../../../test/qaTest.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe("randomUUID", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  qaTest("lib.uuid.01", async () => {
    const mockUUID = "12345678-1234-4abc-89ab-123456789abc";
    const mockCrypto = { randomUUID: vi.fn().mockReturnValue(mockUUID) };
    vi.stubGlobal("crypto", mockCrypto);
    const { randomUUID } = await import("../randomUUID.js");
    expect(randomUUID()).toBe(mockUUID);
    expect(mockCrypto.randomUUID).toHaveBeenCalledOnce();
  });

  qaTest("lib.uuid.02", async () => {
    // Stub crypto without randomUUID to force fallback
    vi.stubGlobal("crypto", {});
    const { randomUUID } = await import("../randomUUID.js");
    const result = randomUUID();
    expect(result).toMatch(UUID_RE);
  });

  qaTest("lib.uuid.03", async () => {
    vi.stubGlobal("crypto", {});
    const { randomUUID } = await import("../randomUUID.js");
    const ids = new Set(Array.from({ length: 100 }, () => randomUUID()));
    expect(ids.size).toBe(100);
  });
});
