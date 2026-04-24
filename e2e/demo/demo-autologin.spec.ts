import { test, expect } from "@playwright/test";
import { DemoPom } from "../poms/DemoPom";

test.describe("demo auto-login", () => {
  test.describe.configure({ mode: "serial" });

  test("/demo redirects to /demo/admin after auto-login", async ({ page }) => {
    const demo = new DemoPom(page);
    await demo.goto();
    await demo.expectAdminShell();
    await expect(page).toHaveURL(/\/demo\/admin/);
  });

  test("demo shell shows core nav tabs", async ({ page }) => {
    const demo = new DemoPom(page);
    await demo.goto();
    await demo.expectAdminShell();
    await expect(demo.navItem("overview")).toBeVisible();
    await expect(demo.navItem("rankings")).toBeVisible();
    await expect(demo.navItem("analytics")).toBeVisible();
  });
});
