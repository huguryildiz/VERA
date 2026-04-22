import { describe, expect, beforeEach, afterEach, vi } from "vitest";
import { qaTest } from "../../../test/qaTest.js";

describe("environment", () => {
  let originalWindow;

  beforeEach(() => {
    originalWindow = global.window;
  });

  afterEach(() => {
    global.window = originalWindow;
    vi.resetModules();
  });

  qaTest("lib.env.01", async () => {
    global.window = { location: { pathname: "/admin/overview" } };
    const { resolveEnvironment } = await import("../environment.js");
    expect(resolveEnvironment()).toBe("prod");
  });

  qaTest("lib.env.02", async () => {
    global.window = { location: { pathname: "/demo/admin/overview" } };
    const { resolveEnvironment } = await import("../environment.js");
    expect(resolveEnvironment()).toBe("demo");
  });

  qaTest("lib.env.03", async () => {
    global.window = undefined;
    const { resolveEnvironment } = await import("../environment.js");
    expect(resolveEnvironment()).toBe("prod");
  });

  qaTest("lib.env.04", async () => {
    global.window = { location: { pathname: "/admin" } };
    const { isDemoEnvironment: isDemoProd } = await import("../environment.js");
    expect(isDemoProd()).toBe(false);

    vi.resetModules();

    global.window = { location: { pathname: "/demo" } };
    const { isDemoEnvironment: isDemoDemo } = await import("../environment.js");
    expect(isDemoDemo()).toBe(true);
  });

  qaTest("lib.env.05", async () => {
    // /demo-settings is NOT in the /demo/* namespace — must resolve as prod
    global.window = { location: { pathname: "/demo-settings" } };
    const { resolveEnvironment } = await import("../environment.js");
    expect(resolveEnvironment()).toBe("prod");
  });
});
