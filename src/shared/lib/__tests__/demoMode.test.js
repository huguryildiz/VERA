import { describe, beforeEach, afterEach, vi, expect } from "vitest";
import { qaTest } from "../../../test/qaTest.js";

describe("demoMode — DEMO_MODE", () => {
  let originalWindow;

  beforeEach(() => {
    originalWindow = global.window;
  });

  afterEach(() => {
    global.window = originalWindow;
    vi.resetModules();
  });

  qaTest("lib.demo.01", async () => {
    global.window = { location: { pathname: "/admin/overview" } };
    const { DEMO_MODE } = await import("../demoMode.js");
    expect(DEMO_MODE).toBe(false);
  });

  qaTest("lib.demo.02", async () => {
    global.window = { location: { pathname: "/demo/admin" } };
    const { DEMO_MODE } = await import("../demoMode.js");
    expect(DEMO_MODE).toBe(true);
  });
});
