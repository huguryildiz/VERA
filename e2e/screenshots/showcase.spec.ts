// e2e/screenshots/showcase.spec.ts
// Captures the 12 showcase PNGs used on the landing page (src/assets/landing/showcase/).
// Runs under the screenshots Playwright project (npm run screenshots).
//
// Theme is pre-seeded via addInitScript so the app renders in the correct mode
// on first paint — no flash, no race with ThemeProvider's localStorage read.
// Scroll is reset to 0,0 before every capture to prevent the sticky admin header
// from overlapping the page title (the root cause of the clipping bug).

import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import {
  gotoAdminPage,
  juryFlowToPin,
  juryFlowFromPinRevealToProgress,
  juryFlowFromProgressToEvaluate,
} from "./_helpers";
import fs from "fs";
import path from "path";

// Showcase images live next to the landing page components, not in docs/.
const SHOWCASE_ROOT = path.resolve(process.cwd(), "src/assets/landing/showcase");

// Override the screenshots project viewport (1440×1080) → 1440×900 for showcase.
// Mobile tests override further via page.setViewportSize() inside each test.
test.use({ viewport: { width: 1440, height: 900 } });

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Register a pre-navigation script that seeds vera-theme in localStorage so
 * ThemeProvider reads the correct value synchronously on mount.
 * Must be called BEFORE the first page.goto().
 */
function seedTheme(page: Page, theme: "dark" | "light"): void {
  // addInitScript accumulates — safe to call alongside other init scripts in helpers.
  void page.addInitScript((t: string) => {
    try {
      localStorage.setItem("vera-theme", t);
    } catch {}
  }, theme);
}

async function captureShowcase(page: Page, filename: string): Promise<void> {
  const outPath = path.join(SHOWCASE_ROOT, filename);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  // Scroll to top so the sticky admin header cannot overlap the page title.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(150);
  await page.screenshot({ path: outPath });
}

// ── Overview ─────────────────────────────────────────────────────────────────

test("showcase: overview dark", async ({ page }) => {
  seedTheme(page, "dark");
  await gotoAdminPage(page, "overview");
  await page.waitForFunction(
    () => {
      const el = document.querySelector("[data-testid='overview-kpi-active-jurors']");
      if (!el) return false;
      const val = el.getAttribute("data-value");
      return val !== null && parseInt(val, 10) > 0;
    },
    { timeout: 20_000 },
  );
  await captureShowcase(page, "overview-dark.png");
});

test("showcase: overview light", async ({ page }) => {
  seedTheme(page, "light");
  await gotoAdminPage(page, "overview");
  await page.waitForFunction(
    () => {
      const el = document.querySelector("[data-testid='overview-kpi-active-jurors']");
      if (!el) return false;
      const val = el.getAttribute("data-value");
      return val !== null && parseInt(val, 10) > 0;
    },
    { timeout: 20_000 },
  );
  await captureShowcase(page, "overview-light.png");
});

// ── Analytics ─────────────────────────────────────────────────────────────────

test("showcase: analytics dark", async ({ page }) => {
  seedTheme(page, "dark");
  await gotoAdminPage(page, "analytics");
  await expect(page.getByTestId("analytics-chart-container")).toBeVisible({ timeout: 20_000 });
  await expect(page.locator("[data-testid^='analytics-att-card-']").first()).toBeVisible({ timeout: 15_000 });
  await captureShowcase(page, "analytics-dark.png");
});

test("showcase: analytics light", async ({ page }) => {
  seedTheme(page, "light");
  await gotoAdminPage(page, "analytics");
  await expect(page.getByTestId("analytics-chart-container")).toBeVisible({ timeout: 20_000 });
  await expect(page.locator("[data-testid^='analytics-att-card-']").first()).toBeVisible({ timeout: 15_000 });
  await captureShowcase(page, "analytics-light.png");
});

// ── Audit Log ─────────────────────────────────────────────────────────────────

test("showcase: auditlog dark", async ({ page }) => {
  seedTheme(page, "dark");
  await gotoAdminPage(page, "audit-log");
  await expect(page.getByTestId("audit-log-page")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("audit-kpi-strip")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId("audit-row").first()).toBeVisible({ timeout: 15_000 });
  await captureShowcase(page, "auditlog-dark.png");
});

test("showcase: auditlog light", async ({ page }) => {
  seedTheme(page, "light");
  await gotoAdminPage(page, "audit-log");
  await expect(page.getByTestId("audit-log-page")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("audit-kpi-strip")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId("audit-row").first()).toBeVisible({ timeout: 15_000 });
  await captureShowcase(page, "auditlog-light.png");
});

// ── Periods ───────────────────────────────────────────────────────────────────

test("showcase: periods dark", async ({ page }) => {
  seedTheme(page, "dark");
  await gotoAdminPage(page, "periods");
  await expect(page.getByTestId("period-row").first()).toBeVisible({ timeout: 15_000 });
  await captureShowcase(page, "periods-dark.png");
});

test("showcase: periods light", async ({ page }) => {
  seedTheme(page, "light");
  await gotoAdminPage(page, "periods");
  await expect(page.getByTestId("period-row").first()).toBeVisible({ timeout: 15_000 });
  await captureShowcase(page, "periods-light.png");
});

// ── Rankings ──────────────────────────────────────────────────────────────────

test("showcase: rankings dark", async ({ page }) => {
  seedTheme(page, "dark");
  await gotoAdminPage(page, "rankings");
  await expect(page.getByTestId("rankings-kpi-strip")).toBeVisible({ timeout: 15_000 });
  await expect(page.locator("[data-testid^='rankings-row-']").first()).toBeVisible({ timeout: 20_000 });
  await captureShowcase(page, "rankings-dark.png");
});

test("showcase: rankings light", async ({ page }) => {
  seedTheme(page, "light");
  await gotoAdminPage(page, "rankings");
  await expect(page.getByTestId("rankings-kpi-strip")).toBeVisible({ timeout: 15_000 });
  await expect(page.locator("[data-testid^='rankings-row-']").first()).toBeVisible({ timeout: 20_000 });
  await captureShowcase(page, "rankings-light.png");
});

// ── Jury Evaluate (mobile portrait) ──────────────────────────────────────────
// Uses a fresh juror each run — demo DB daily reset reverts these.

test("showcase: jury-evaluate-mobile dark", async ({ page }) => {
  seedTheme(page, "dark");
  await page.setViewportSize({ width: 390, height: 844 });
  // Unique name avoids colliding with jury-tour runs that use fixed names.
  await juryFlowToPin(page, `Fatma Kılıç ${Date.now()}`, "Boğaziçi Üniversitesi / Bilgisayar Müh.");
  await juryFlowFromPinRevealToProgress(page);
  await juryFlowFromProgressToEvaluate(page);
  await captureShowcase(page, "jury-evaluate-mobile-dark.png");
});

test("showcase: jury-evaluate-mobile light", async ({ page }) => {
  seedTheme(page, "light");
  await page.setViewportSize({ width: 390, height: 844 });
  await juryFlowToPin(page, `Ali Yıldırım ${Date.now()}`, "Ankara Üniversitesi / Endüstri Müh.");
  await juryFlowFromPinRevealToProgress(page);
  await juryFlowFromProgressToEvaluate(page);
  await captureShowcase(page, "jury-evaluate-mobile-light.png");
});
