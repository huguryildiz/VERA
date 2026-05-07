/**
 * LinkedIn demo video — Scene 2: Admin dashboard
 * Viewport: 1280×800, dark mode (laptop screen)
 *
 * Flow:
 *   0:00 Demo auto-login animation
 *   0:03 Rankings page — table with live-looking data
 *   0:06 Hover + highlight a row (realtime feel)
 *   0:08 Click Export → panel slides open → MÜDEK format options
 *
 * Prerequisites:
 *   npm run dev   (localhost:5173 must be running)
 *
 * Usage:
 *   node scripts/record-admin-dashboard.mjs
 *
 * Output:
 *   recordings/admin-dashboard.webm
 *   recordings/admin-dashboard.mp4
 */

import { chromium } from "@playwright/test";
import { statSync, readdirSync, renameSync, mkdirSync } from "fs";
import { resolve, join } from "path";
import { execSync } from "child_process";

const ROOT = resolve(import.meta.dirname, "..");
const RECORDINGS_DIR = join(ROOT, "recordings");
mkdirSync(RECORDINGS_DIR, { recursive: true });

const BASE_URL = "http://localhost:5173";

// Laptop / tablet viewport
const VIEWPORT = { width: 1280, height: 800 };

async function main() {
  const browser = await chromium.launch({
    headless: false,
    args: ["--disable-blink-features=AutomationControlled"],
  });

  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    colorScheme: "dark",
    recordVideo: {
      dir: RECORDINGS_DIR,
      size: VIEWPORT,
    },
  });

  const page = await context.newPage();

  try {
    // ── Demo auto-login ───────────────────────────────────────────
    console.log("▶  Demo auto-login…");
    await page.goto(`${BASE_URL}/demo`, { waitUntil: "networkidle" });

    // Wait through the DemoAdminLoader animation (~3-4s) + redirect
    await page.waitForURL("**/demo/admin/**", { timeout: 20000 });
    console.log("▶  Admin panel loaded");
    await page.waitForTimeout(1500);

    // ── Navigate to Rankings ──────────────────────────────────────
    console.log("▶  Navigating to Rankings…");
    await page.goto(`${BASE_URL}/demo/admin/rankings`, { waitUntil: "networkidle" });

    // Wait for the table to populate
    await page.waitForSelector('[data-testid="rankings-kpi-strip"]', {
      timeout: 10000,
    });
    await page.waitForTimeout(1500);
    console.log("▶  Rankings page visible");

    // Slow scroll to reveal rows (realtime-feel)
    await page.evaluate(() =>
      window.scrollTo({ top: 100, behavior: "smooth" })
    );
    await page.waitForTimeout(800);
    await page.evaluate(() =>
      window.scrollTo({ top: 300, behavior: "smooth" })
    );
    await page.waitForTimeout(1000);

    // Hover over first data row to highlight it (live-update feel)
    const firstRow = page.locator("table tbody tr, .rank-row, .rk-row").first();
    const rowCount = await firstRow.count();
    if (rowCount > 0) {
      await firstRow.hover();
      await page.waitForTimeout(600);
    }
    await page.waitForTimeout(600);

    // Scroll back up for the export button
    await page.evaluate(() =>
      window.scrollTo({ top: 0, behavior: "smooth" })
    );
    await page.waitForTimeout(800);

    // ── Export panel ──────────────────────────────────────────────
    console.log("▶  Opening export panel…");
    const exportBtn = page.locator('[data-testid="rankings-export-btn"]');
    await exportBtn.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await exportBtn.hover();
    await page.waitForTimeout(500);
    await exportBtn.click();

    // Wait for export panel to slide in
    await page.waitForSelector('[data-testid="rankings-export-panel"].show', {
      timeout: 5000,
    });
    await page.waitForTimeout(2500);

    // Hover over the xlsx format option for emphasis
    const xlsxOpt = page.locator('[data-testid="rankings-export-format-xlsx"]');
    if (await xlsxOpt.count()) {
      await xlsxOpt.hover();
      await page.waitForTimeout(800);
    }

    // Highlight the download button
    const dlBtn = page.locator('[data-testid="rankings-export-download-btn"]');
    if (await dlBtn.count()) {
      await dlBtn.hover();
      await page.waitForTimeout(1200);
    }

    // Hold the final frame
    await page.waitForTimeout(1500);

    console.log("▶  Scene 2 complete — closing context…");
  } catch (err) {
    console.error("❌  Error:", err.message);
  } finally {
    await context.close();
    await browser.close();
  }

  // ── Rename & convert ──────────────────────────────────────────────────────
  const existingWebms = new Set(["jury-mobile.webm"]);
  const files = readdirSync(RECORDINGS_DIR).filter(
    (f) => f.endsWith(".webm") && !existingWebms.has(f) && f !== "admin-dashboard.webm"
  );

  if (files.length) {
    const newest = files
      .map((f) => ({ f, mtime: statSync(join(RECORDINGS_DIR, f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime)[0].f;
    const webmPath = join(RECORDINGS_DIR, "admin-dashboard.webm");
    renameSync(join(RECORDINGS_DIR, newest), webmPath);
    console.log(`✅  Saved: recordings/admin-dashboard.webm`);

    try {
      const mp4Path = join(RECORDINGS_DIR, "admin-dashboard.mp4");
      execSync(
        `ffmpeg -y -i "${webmPath}" -vf "scale=1280:800" -c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p "${mp4Path}"`,
        { stdio: "inherit" }
      );
      console.log(`✅  Converted: recordings/admin-dashboard.mp4`);
    } catch {
      console.warn("⚠️  ffmpeg conversion failed — use admin-dashboard.webm directly");
    }
  } else {
    console.warn("⚠️  No new .webm file found in recordings/");
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
