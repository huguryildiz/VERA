/**
 * LinkedIn demo video — Scene 1: Jury scoring on mobile
 * Viewport: iPhone 14 Pro (393×852), dark mode
 *
 * Flow:
 *   0:00 Token verification loading screen (QR-scan feel)
 *   0:02 Identity form → quick fill → submit
 *   0:04 PIN Reveal screen — 4-digit PIN displayed
 *   0:06 Evaluate screen — score inputs filling in
 *   0:09 Submit button active → bottom bar
 *
 * Prerequisites:
 *   npm run dev   (localhost:5173 must be running)
 *
 * Usage:
 *   node scripts/record-jury-mobile.mjs
 *
 * Output:
 *   recordings/jury-mobile.webm  (auto-named by Playwright)
 *   recordings/jury-mobile.mp4   (converted via ffmpeg)
 */

import { chromium } from "@playwright/test";
import { statSync, readdirSync, renameSync, mkdirSync } from "fs";
import { resolve, join } from "path";
import { execSync } from "child_process";

// ── Read .env.local ────────────────────────────────────────────────────────
const ROOT = resolve(import.meta.dirname, "..");
const envPath = join(ROOT, ".env.local");
const envVars = {};
readFileSync(envPath, "utf8")
  .split("\n")
  .forEach((line) => {
    const eqIdx = line.indexOf("=");
    if (eqIdx < 1) return;
    const key = line.slice(0, eqIdx).trim();
    const val = line.slice(eqIdx + 1).trim();
    if (key) envVars[key] = val;
  });

const ENTRY_TOKEN = envVars["VITE_DEMO_ENTRY_TOKEN"];
if (!ENTRY_TOKEN) {
  console.error("❌  VITE_DEMO_ENTRY_TOKEN not found in .env.local");
  process.exit(1);
}

const BASE_URL = "http://localhost:5173";
const RECORDINGS_DIR = join(ROOT, "recordings");
mkdirSync(RECORDINGS_DIR, { recursive: true });

// iPhone 14 Pro
const VIEWPORT = { width: 393, height: 852 };

// Slow typing for cinematic effect
async function typeSlow(page, selector, text, delay = 70) {
  await page.locator(selector).click();
  for (const ch of text) {
    await page.keyboard.type(ch);
    await page.waitForTimeout(delay + Math.random() * 30);
  }
}

async function main() {
  const browser = await chromium.launch({
    headless: false,
    args: ["--disable-blink-features=AutomationControlled"],
  });

  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
    colorScheme: "dark",
    recordVideo: {
      dir: RECORDINGS_DIR,
      size: VIEWPORT,
    },
  });

  const page = await context.newPage();

  try {
    console.log("▶  Scene 1: Token verification…");

    // ── 0:00  Token verification loading screen ───────────────────
    await page.goto(`${BASE_URL}/demo/eval?t=${ENTRY_TOKEN}`, {
      waitUntil: "networkidle",
    });

    // Show the loading animation (3.5s enforced min + a breath)
    await page.waitForTimeout(4200);

    // ── 0:04  Identity step (redirect happens automatically) ──────
    await page.waitForURL("**/jury/identity", { timeout: 12000 });
    await page.waitForSelector('[data-testid="jury-name-input"]', {
      timeout: 6000,
    });
    console.log("▶  Identity step loaded");
    await page.waitForTimeout(600);

    // Fill name cinematically
    await typeSlow(page, '[data-testid="jury-name-input"]', "Prof. Ayşe Kaya");
    await page.waitForTimeout(400);

    // Fill affiliation
    await typeSlow(
      page,
      '[data-testid="jury-affiliation-input"]',
      "ODTÜ / Bilgisayar Müh.",
      60
    );
    await page.waitForTimeout(700);

    // Submit
    await page.locator('[data-testid="jury-identity-submit"]').click();
    console.log("▶  Submitted identity, waiting for PIN reveal…");
    await page.waitForTimeout(2000);

    // ── 0:xx  PIN Reveal ──────────────────────────────────────────
    await page.waitForURL("**/jury/pin-reveal", { timeout: 12000 });
    console.log("▶  PIN Reveal screen");
    // Hold on PIN screen — this is the "PIN entry" visual
    await page.waitForTimeout(3500);

    // Click "Begin Evaluation"
    await page.locator(".pr-tour-begin").click();
    console.log("▶  Begin Evaluation clicked");
    await page.waitForTimeout(2500);

    // ── 0:xx  Evaluate step ───────────────────────────────────────
    await page.waitForURL("**/jury/evaluate", { timeout: 12000 });
    console.log("▶  Evaluate step loaded");
    await page.waitForTimeout(1200);

    // Scroll down gently to show criteria list
    await page.evaluate(() =>
      window.scrollTo({ top: 120, behavior: "smooth" })
    );
    await page.waitForTimeout(1000);

    // Fill the first criterion score (find all score inputs)
    const scoreInputs = page.locator(".dj-score-input");
    const count = await scoreInputs.count();
    console.log(`▶  Found ${count} score inputs`);

    if (count >= 1) {
      await scoreInputs.nth(0).click();
      await page.waitForTimeout(300);
      await page.keyboard.type("82");
      await scoreInputs.nth(0).dispatchEvent("blur");
      await page.waitForTimeout(600);
    }
    if (count >= 2) {
      await scoreInputs.nth(1).click();
      await page.waitForTimeout(200);
      await page.keyboard.type("78");
      await scoreInputs.nth(1).dispatchEvent("blur");
      await page.waitForTimeout(500);
    }
    if (count >= 3) {
      // Scroll to show more
      await page.evaluate(() =>
        window.scrollTo({ top: 280, behavior: "smooth" })
      );
      await page.waitForTimeout(600);
      await scoreInputs.nth(2).click();
      await page.waitForTimeout(200);
      await page.keyboard.type("91");
      await scoreInputs.nth(2).dispatchEvent("blur");
      await page.waitForTimeout(500);
    }
    if (count >= 4) {
      await scoreInputs.nth(3).click();
      await page.waitForTimeout(200);
      await page.keyboard.type("85");
      await scoreInputs.nth(3).dispatchEvent("blur");
      await page.waitForTimeout(600);
    }

    // Scroll down to show the sticky bottom bar
    await page.evaluate(() =>
      window.scrollTo({ top: 9999, behavior: "smooth" })
    );
    await page.waitForTimeout(1400);

    // Scroll back up for a nice final shot
    await page.evaluate(() =>
      window.scrollTo({ top: 0, behavior: "smooth" })
    );
    await page.waitForTimeout(1200);

    console.log("▶  Scene 1 complete — closing context…");
  } catch (err) {
    console.error("❌  Error:", err.message);
  } finally {
    await context.close();
    await browser.close();
  }

  // ── Rename & convert ──────────────────────────────────────────────────────
  // Playwright names the video with a random UUID; rename it.
  const files = readdirSync(RECORDINGS_DIR).filter((f) => f.endsWith(".webm") && f !== "jury-mobile.webm");
  if (files.length) {
    const newest = files
      .map((f) => ({ f, t: statSync(join(RECORDINGS_DIR, f)).mtimeMs }))
      .sort((a, b) => b.t - a.t)[0].f;
    const webmPath = join(RECORDINGS_DIR, "jury-mobile.webm");
    renameSync(join(RECORDINGS_DIR, newest), webmPath);
    console.log(`✅  Saved: recordings/jury-mobile.webm`);

    try {
      const mp4Path = join(RECORDINGS_DIR, "jury-mobile.mp4");
      execSync(
        `ffmpeg -y -i "${webmPath}" -vf "scale=393:852" -c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p "${mp4Path}"`,
        { stdio: "inherit" }
      );
      console.log(`✅  Converted: recordings/jury-mobile.mp4`);
    } catch {
      console.warn("⚠️  ffmpeg conversion failed — use jury-mobile.webm directly");
    }
  } else {
    console.warn("⚠️  No .webm file found in recordings/");
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
