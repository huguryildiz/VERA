/**
 * VERA — LinkedIn launch video (15s, vertical 1080×1350)
 *
 * Records six scenes against the **demo DB** (/demo/* routes, DemoAdminLoader
 * auto-login) into two native-resolution webm clips, then composes them with
 * a single ffmpeg invocation into a single 1080×1350 MP4 with burned-in
 * English captions + scene titles.
 *
 * No production code, auth, RLS, or seed data is touched. Only tooling.
 *
 * Prerequisites:
 *   - `npm run dev` running on http://localhost:5173 (NOT the e2e port 5174)
 *   - `.env.local` containing VITE_DEMO_ENTRY_TOKEN (defaults to "demo-tedu-ee")
 *   - ffmpeg + ffprobe on PATH
 *
 * Usage:
 *   npm run record:linkedin                # captions + titles on (default)
 *   npm run record:linkedin -- --no-titles # caption band only
 *   npm run record:linkedin -- --no-captions --no-titles  # raw video
 *
 * Output:
 *   recordings/_clip-jury.webm        (393×852 mobile, intermediate)
 *   recordings/_clip-desktop.webm     (1440×900 desktop, intermediate)
 *   recordings/_captions.srt          (timed English caption track)
 *   recordings/vera-linkedin-demo.mp4 (final — upload this to LinkedIn)
 */

import { chromium } from "@playwright/test";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
} from "fs";
import { join, resolve } from "path";
import { execSync, spawnSync } from "child_process";

/**
 * Resolve ffmpeg binary. Prefer a full-featured build (drawtext + subtitles)
 * over the minimal homebrew-core formula:
 *   1. $VERA_VIDEO_FFMPEG (explicit override)
 *   2. /opt/homebrew/opt/ffmpeg-full/bin/ffmpeg (Homebrew keg-only `ffmpeg-full`)
 *   3. /opt/homebrew/Cellar/ffmpeg-full/*​/bin/ffmpeg (versioned cellar path)
 *   4. plain `ffmpeg` on PATH
 */
function resolveFfmpegBinary() {
  if (process.env.VERA_VIDEO_FFMPEG && existsSync(process.env.VERA_VIDEO_FFMPEG)) {
    return process.env.VERA_VIDEO_FFMPEG;
  }
  const optPath = "/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg";
  if (existsSync(optPath)) return optPath;
  try {
    const cellar = readdirSync("/opt/homebrew/Cellar/ffmpeg-full").sort().reverse();
    for (const v of cellar) {
      const p = `/opt/homebrew/Cellar/ffmpeg-full/${v}/bin/ffmpeg`;
      if (existsSync(p)) return p;
    }
  } catch {}
  return "ffmpeg";
}
const FFMPEG = resolveFfmpegBinary();

/** Run ffmpeg with array args (no shell escaping). Throws on non-zero exit. */
function runFfmpeg(args) {
  const result = spawnSync(FFMPEG, args, { stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error(`ffmpeg exited with status ${result.status}`);
  }
}

// ── Config ────────────────────────────────────────────────────────────────
const ROOT = resolve(import.meta.dirname, "..");
const RECORDINGS_DIR = join(ROOT, "recordings");
const BASE_URL = "http://localhost:5173";

const MOBILE_VIEWPORT = { width: 393, height: 852 };  // iPhone 14 Pro
const DESKTOP_VIEWPORT = { width: 1440, height: 900 };

// Record at physical (device) pixel resolution so ffmpeg can downscale → sharper output.
// deviceScaleFactor=2 for desktop, 3 for mobile — match actual rendering pixel density.
const DESKTOP_RECORD_SIZE = { width: DESKTOP_VIEWPORT.width * 2, height: DESKTOP_VIEWPORT.height * 2 }; // 2880×1800
const MOBILE_RECORD_SIZE = { width: MOBILE_VIEWPORT.width * 3, height: MOBILE_VIEWPORT.height * 3 };   // 1179×2556

const FINAL_W = 1080;
const FINAL_H = 1350;
const BG = "#0b0d12"; // VERA dark page bg

// VERA's design system uses Geist + Inter (sans-serif, geometric). On macOS,
// SF Pro (SFNS.ttf) is the closest system-installed match to that aesthetic
// and ships at full weight range. Override via VERA_VIDEO_FONT env var.
const FONT_FILE =
  process.env.VERA_VIDEO_FONT ||
  "/System/Library/Fonts/SFNS.ttf";

// ── CLI flags ─────────────────────────────────────────────────────────────
const args = new Set(process.argv.slice(2));
const SKIP_MOBILE = args.has("--skip-mobile");
const SKIP_DESKTOP = args.has("--skip-desktop");
const SKIP_COMPOSE = args.has("--skip-compose");
const NO_CAPTIONS = args.has("--no-captions");
const NO_TITLES = args.has("--no-titles");
// --with-labels is a legacy alias = both on (which is already default)

// ── Pre-flight ────────────────────────────────────────────────────────────
mkdirSync(RECORDINGS_DIR, { recursive: true });

const envPath = join(ROOT, ".env.local");
if (!existsSync(envPath)) {
  console.error("❌  .env.local not found at repo root.");
  process.exit(1);
}
const envVars = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split("\n")
    .map((l) => {
      const i = l.indexOf("=");
      return i > 0 ? [l.slice(0, i).trim(), l.slice(i + 1).trim()] : null;
    })
    .filter(Boolean)
);
const ENTRY_TOKEN = envVars.VITE_DEMO_ENTRY_TOKEN || "demo-tedu-ee";

// ffmpeg present?
try {
  execSync("ffmpeg -version", { stdio: "ignore" });
  execSync("ffprobe -version", { stdio: "ignore" });
} catch {
  console.error("❌  ffmpeg / ffprobe not on PATH. Install via `brew install ffmpeg`.");
  process.exit(1);
}

// Does this ffmpeg build include drawtext? Many minimal builds (incl. recent
// Homebrew releases) ship without libfreetype/libass, so drawtext + subtitles
// are absent. We auto-detect once and skip text overlays gracefully if so.
let HAS_DRAWTEXT = false;
try {
  const filters = execSync(`${FFMPEG} -hide_banner -filters`, { encoding: "utf8" });
  HAS_DRAWTEXT = /\bdrawtext\b/.test(filters);
} catch {
  HAS_DRAWTEXT = false;
}
console.log(`▶  ffmpeg: ${FFMPEG}${HAS_DRAWTEXT ? "  (drawtext ✓)" : "  (drawtext ✗)"}`);

// dev server reachable? (skip the check if compose-only)
if (!SKIP_MOBILE || !SKIP_DESKTOP) {
  try {
    const res = await fetch(BASE_URL, { method: "GET" });
    if (!res.ok) throw new Error(`status ${res.status}`);
  } catch (err) {
    console.error(
      `❌  ${BASE_URL} not reachable (${err.message}). Run \`npm run dev\` in another terminal.`
    );
    process.exit(1);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────

/** Snapshot current webm filenames in recordings/ — used to detect newly-created files. */
function snapshotWebms() {
  return new Set(
    readdirSync(RECORDINGS_DIR).filter((f) => f.endsWith(".webm"))
  );
}

/** Find the newest webm not in `before` and rename it to `target`. Returns full path. */
function claimNewWebm(before, target) {
  const after = readdirSync(RECORDINGS_DIR).filter((f) => f.endsWith(".webm"));
  const newOnes = after.filter((f) => !before.has(f));
  if (newOnes.length === 0) {
    throw new Error(`No new webm produced (expected → ${target})`);
  }
  const newest = newOnes
    .map((f) => ({ f, t: statSync(join(RECORDINGS_DIR, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t)[0].f;
  const dest = join(RECORDINGS_DIR, target);
  renameSync(join(RECORDINGS_DIR, newest), dest);
  console.log(`✓  ${target}`);
  return dest;
}

/** Type a string into a focused element with cinematic per-character delay. */
async function typeSlow(page, selector, text, delay = 65) {
  await page.locator(selector).click();
  for (const ch of text) {
    await page.keyboard.type(ch);
    await page.waitForTimeout(delay + Math.random() * 25);
  }
}

/** Pre-seed localStorage/sessionStorage so theme + tour state are stable from first paint. */
async function seedPageState(page, { theme, suppressJuryTours = false, suppressAdminTour = false }) {
  await page.addInitScript(
    ({ t, sj, sa }) => {
      try {
        if (t) localStorage.setItem("vera-theme", t);
        if (sa) localStorage.setItem("vera.admin_tour_done", "1");
        if (sj) {
          const KEYS = [
            "dj_tour_identity",
            "dj_tour_pin_reveal",
            "dj_tour_progress_fresh",
            "dj_tour_progress_resume",
            "dj_tour_eval",
            "dj_tour_rubric",
            "dj_tour_confirm",
            "dj_tour_done",
          ];
          KEYS.forEach((k) => sessionStorage.setItem(k, "1"));
        }
      } catch {}
    },
    { t: theme, sj: suppressJuryTours, sa: suppressAdminTour }
  );
}

// ── Storage-state pre-warm ────────────────────────────────────────────────
// Run /demo (DemoAdminLoader) once and capture the post-auth storageState so
// every subsequent admin scene skips the loader and lands on the admin route
// in <1s, instead of the 3-5s cold-start auth path.
async function prewarmAdminStorageState() {
  console.log("▶  Pre-warm: capturing admin storageState…");
  const browser = await chromium.launch({
    headless: false,
    args: ["--disable-blink-features=AutomationControlled"],
  });
  const context = await browser.newContext({
    viewport: DESKTOP_VIEWPORT,
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  await seedPageState(page, { theme: "light", suppressAdminTour: true });

  await page.goto(`${BASE_URL}/demo`, { waitUntil: "domcontentloaded" });
  await page.waitForURL(/\/demo\/admin\//, { timeout: 30_000 });
  // Touch one admin page so cookies + indexedDB are fully primed.
  await page.goto(`${BASE_URL}/demo/admin/overview`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);

  const state = await context.storageState();
  await context.close();
  await browser.close();
  console.log(`✓  storageState captured (${state.cookies.length} cookies, ${state.origins.length} origins)`);
  return state;
}

// ── Scene 1: Landing (desktop, ~4s) ──────────────────────────────────────
async function recordSceneLanding() {
  console.log("▶  Scene 1: landing…");
  const before = snapshotWebms();
  const browser = await chromium.launch({
    headless: false,
    args: ["--disable-blink-features=AutomationControlled"],
  });
  const context = await browser.newContext({
    viewport: DESKTOP_VIEWPORT,
    deviceScaleFactor: 2,
    colorScheme: "dark",
    recordVideo: { dir: RECORDINGS_DIR, size: DESKTOP_RECORD_SIZE },
  });
  const page = await context.newPage();
  await seedPageState(page, { theme: "dark" });

  try {
    await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
    await page.waitForTimeout(3500); // visible content time
  } finally {
    await context.close();
    await browser.close();
  }
  return claimNewWebm(before, "_scene-landing.webm");
}

// ── Scene 3: Heatmap light → toggle → dark hold (desktop, ~7s) ──────────
// Heatmap chosen over Rankings because the demo DB's active period reliably
// populates the heatmap grid (admin-tour.spec.ts confirms data) whereas
// rankings empties to "No Scores Yet" depending on which period is active.
async function recordSceneHeatmap(storageState) {
  console.log("▶  Scene 3: heatmap + theme toggle…");
  const before = snapshotWebms();
  const browser = await chromium.launch({
    headless: false,
    args: ["--disable-blink-features=AutomationControlled"],
  });
  const context = await browser.newContext({
    viewport: DESKTOP_VIEWPORT,
    deviceScaleFactor: 2,
    colorScheme: "light",
    storageState,
    recordVideo: { dir: RECORDINGS_DIR, size: DESKTOP_RECORD_SIZE },
  });
  const page = await context.newPage();
  await seedPageState(page, { theme: "light", suppressAdminTour: true });

  try {
    await page.goto(`${BASE_URL}/demo/admin/heatmap`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('[data-testid="heatmap-grid"]', { timeout: 25_000 });
    await page
      .waitForSelector("[data-testid^='heatmap-juror-avg-']", { timeout: 20_000 })
      .catch(() => null);
    await page.waitForTimeout(1100); // wait for grid cells to fully render
    await page.waitForTimeout(1900); // light mode hold

    // Click theme toggle for live light → dark transition
    const themeToggle = page.locator(".sb-theme-toggle").first();
    if (await themeToggle.count()) {
      await themeToggle.click();
    } else {
      await page.evaluate(() => localStorage.setItem("vera-theme", "dark"));
    }
    await page.waitForTimeout(2200); // dark hold
  } finally {
    await context.close();
    await browser.close();
  }
  return claimNewWebm(before, "_scene-heatmap.webm");
}

// ── Scene 4: Analytics (desktop, dark, ~7s) ──────────────────────────────
async function recordSceneAnalytics(storageState) {
  console.log("▶  Scene 4: analytics…");
  const before = snapshotWebms();
  const browser = await chromium.launch({
    headless: false,
    args: ["--disable-blink-features=AutomationControlled"],
  });
  const context = await browser.newContext({
    viewport: DESKTOP_VIEWPORT,
    deviceScaleFactor: 2,
    colorScheme: "dark",
    storageState,
    recordVideo: { dir: RECORDINGS_DIR, size: DESKTOP_RECORD_SIZE },
  });
  const page = await context.newPage();
  await seedPageState(page, { theme: "dark", suppressAdminTour: true });

  try {
    await page.goto(`${BASE_URL}/demo/admin/analytics`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('[data-testid="analytics-chart-container"]', { timeout: 25_000 });
    await page
      .waitForSelector("[data-testid^='analytics-att-card-']", { timeout: 15_000 })
      .catch(() => null);
    await page.waitForTimeout(900);

    const firstAtt = page.locator("[data-testid^='analytics-att-card-']").first();
    if (await firstAtt.count()) {
      await firstAtt.hover({ force: true });
      await page.waitForTimeout(1500);
    }
    await page.evaluate(() => window.scrollTo({ top: 240, behavior: "smooth" }));
    await page.waitForTimeout(1600);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
    await page.waitForTimeout(1200);
  } finally {
    await context.close();
    await browser.close();
  }
  return claimNewWebm(before, "_scene-analytics.webm");
}

// ── Scene 5: Audit log (desktop, dark, ~7s) ──────────────────────────────
async function recordSceneAudit(storageState) {
  console.log("▶  Scene 5: audit log…");
  const before = snapshotWebms();
  const browser = await chromium.launch({
    headless: false,
    args: ["--disable-blink-features=AutomationControlled"],
  });
  const context = await browser.newContext({
    viewport: DESKTOP_VIEWPORT,
    deviceScaleFactor: 2,
    colorScheme: "dark",
    storageState,
    recordVideo: { dir: RECORDINGS_DIR, size: DESKTOP_RECORD_SIZE },
  });
  const page = await context.newPage();
  await seedPageState(page, { theme: "dark", suppressAdminTour: true });

  try {
    await page.goto(`${BASE_URL}/demo/admin/audit-log`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('[data-testid="audit-log-page"]', { timeout: 25_000 });
    await page
      .waitForSelector('[data-testid="audit-row"]', { timeout: 20_000 })
      .catch(() => null);
    await page.waitForTimeout(1200);

    const firstAudit = page.locator('[data-testid="audit-row"]').first();
    if (await firstAudit.count()) {
      await firstAudit.hover({ force: true });
      await page.waitForTimeout(1500);
    }
    await page.evaluate(() => window.scrollTo({ top: 200, behavior: "smooth" }));
    await page.waitForTimeout(1400);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
    await page.waitForTimeout(1500);
  } finally {
    await context.close();
    await browser.close();
  }
  return claimNewWebm(before, "_scene-audit.webm");
}

// ── Scene 2: Mobile jury — full multi-project scoring flow ──────────────────
// Flow:
//   identity (cinematic typing) → PIN reveal → progress → evaluate
//   Project 1: score 2 criteria → open rubric → show Mapped Outcomes → show
//              Scoring Bands → close rubric → score 1 more criterion
//   Tap blue group bar → project list drawer opens (all projects visible)
//   Select Project 2 → score 2-3 criteria → tap group bar again (navigation)
async function recordMobileClip() {
  console.log("▶  Scene 2: mobile jury clip (393×852)…");
  const before = snapshotWebms();

  const browser = await chromium.launch({
    headless: false,
    args: ["--disable-blink-features=AutomationControlled"],
  });

  const context = await browser.newContext({
    viewport: MOBILE_VIEWPORT,
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
    colorScheme: "dark",
    recordVideo: { dir: RECORDINGS_DIR, size: MOBILE_RECORD_SIZE },
  });

  const page = await context.newPage();

  // Suppress ALL tours so the UI is clean and manual interactions are unblocked.
  await page.addInitScript(() => {
    try {
      localStorage.setItem("vera-theme", "dark");
      [
        "dj_tour_identity",
        "dj_tour_pin_reveal",
        "dj_tour_progress_fresh",
        "dj_tour_progress_resume",
        "dj_tour_eval",
        "dj_tour_rubric",
        "dj_tour_confirm",
        "dj_tour_done",
      ].forEach((k) => sessionStorage.setItem(k, "1"));
    } catch {}
  });

  /** Enter a score value into a `.dj-score-input`. Returns the max for that criterion. */
  async function enterScore(input, pct = 0.88) {
    const max = await input
      .evaluate((el) => {
        const row = el.closest(".dj-score-row");
        const frac = row?.querySelector(".dj-score-frac");
        const m = frac?.textContent?.match(/\/\s*(\d+)/);
        return m ? Number(m[1]) : 30;
      })
      .catch(() => 30);
    const value = String(Math.max(1, Math.round(max * pct)));
    await input.click();
    await page.waitForTimeout(180);
    for (const ch of value) {
      await page.keyboard.type(ch);
      await page.waitForTimeout(100);
    }
    await input.dispatchEvent("blur");
    await page.waitForTimeout(350);
    return max;
  }

  try {
    // ── Identity ──────────────────────────────────────────────────────────
    await page.goto(`${BASE_URL}/demo/eval?t=${ENTRY_TOKEN}`, { waitUntil: "domcontentloaded" });
    await page.waitForURL(/\/demo\/jury\/(arrival|identity)/, { timeout: 25_000 });
    await page.waitForTimeout(300);

    const arrival = page.getByTestId("jury-arrival-step");
    if (await arrival.count()) await arrival.click();

    await page.waitForSelector('[data-testid="jury-name-input"]', { timeout: 15_000 });
    await page.waitForTimeout(400);

    // Fixed real-looking juror name for deterministic recording
    await typeSlow(page, '[data-testid="jury-name-input"]', "Prof. Dr. Ayşe Kaya", 72);
    await page.waitForTimeout(300);
    await typeSlow(page, '[data-testid="jury-affiliation-input"]', "Boğaziçi Üni. / Bilgisayar Müh.", 58);
    await page.waitForTimeout(1600); // pause on filled identity form
    await page.locator('[data-testid="jury-identity-submit"]').click();

    // ── PIN reveal ────────────────────────────────────────────────────────
    await page.waitForURL(/\/demo\/jury\/pin-reveal/, { timeout: 20_000 });
    await page.waitForTimeout(1200); // brief hold

    const beginBtn = page.locator(".pr-tour-begin, button:has-text('Begin Evaluation')").first();
    if (await beginBtn.count()) await beginBtn.click();

    // ── Progress → Evaluate ───────────────────────────────────────────────
    await page.waitForURL(/\/demo\/jury\/progress/, { timeout: 25_000 });
    await page.waitForTimeout(400);
    await page.getByTestId("jury-progress-action").click();

    await page.waitForURL(/\/demo\/jury\/evaluate/, { timeout: 20_000 });
    await page.waitForSelector(".dj-score-input", { timeout: 15_000 });
    await page.waitForTimeout(800);

    // ── Project 1: score criteria 0 and 1 ────────────────────────────────
    const scores = page.locator(".dj-score-input");
    await enterScore(scores.nth(0), 0.85);
    await page.evaluate(() => window.scrollTo({ top: 80, behavior: "smooth" }));
    await page.waitForTimeout(300);
    await enterScore(scores.nth(1), 0.90);
    await page.waitForTimeout(400);

    // ── Open rubric for criterion 1 ───────────────────────────────────────
    // Scroll to make the rubric button for criterion 1 visible
    await page.evaluate(() => window.scrollTo({ top: 60, behavior: "smooth" }));
    await page.waitForTimeout(400);
    const rubricBtns = page.locator(".dj-rubric-btn");
    if (await rubricBtns.count()) {
      await rubricBtns.nth(1).scrollIntoViewIfNeeded().catch(() => {});
      await rubricBtns.nth(1).click({ timeout: 3000 }).catch(() => {});
      await page.waitForSelector(".dj-rub-sheet.open", { timeout: 5_000 }).catch(() => {});
      await page.waitForTimeout(1000); // hold on rubric header + blurb

      // Expand "Mapped Outcomes" section
      const metaToggles = page.locator(".dj-rub-meta-toggle");
      if (await metaToggles.count() >= 1) {
        await metaToggles.nth(0).click({ timeout: 2000 }).catch(() => {});
        await page.waitForTimeout(2000); // hold to show outcome codes + descriptions
      }

      // Expand "Scoring Bands" section (second toggle)
      if (await metaToggles.count() >= 2) {
        await metaToggles.nth(1).click({ timeout: 2000 }).catch(() => {});
        await page.waitForTimeout(2200); // hold to show band rows (Excellent / Good / etc.)
      }

      // Close the rubric sheet
      const closeBtn = page.locator(".dj-rub-sheet-close").first();
      if (await closeBtn.count()) {
        await closeBtn.click({ timeout: 2000 }).catch(() => {});
        await page.waitForTimeout(600);
      }
    }

    // Score criterion 2 (one more before switching project)
    await page.evaluate(() => window.scrollTo({ top: 140, behavior: "smooth" }));
    await page.waitForTimeout(300);
    if (await scores.count() > 2) {
      await enterScore(scores.nth(2), 0.87);
    }
    await page.waitForTimeout(300);

    // ── Tap the blue group bar → project list drawer ──────────────────────
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
    await page.waitForTimeout(500);
    const groupBar = page.locator(".dj-group-bar").first();
    if (await groupBar.count()) {
      await groupBar.click({ timeout: 3000 }).catch(() => {});
      await page.waitForSelector(".dj-drawer-sheet", { timeout: 5_000 }).catch(() => {});
      await page.waitForTimeout(800); // pause to show header + summary stats

      // Scroll the project list gently so all entries are visible
      const drawerList = page.locator(".dj-drawer-list").first();
      if (await drawerList.count()) {
        await drawerList.evaluate((el) => el.scrollTo({ top: 100, behavior: "smooth" }));
        await page.waitForTimeout(900);
        await drawerList.evaluate((el) => el.scrollTo({ top: 0, behavior: "smooth" }));
        await page.waitForTimeout(600);
      }

      // Select the second project (index 1 = not the current one)
      const drawerItems = page.locator(".dj-drawer-item");
      const itemCount = await drawerItems.count();
      const targetIdx = itemCount > 1 ? 1 : 0;
      await drawerItems.nth(targetIdx).click({ timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(700);
    }

    // ── Project 2: score 2-3 criteria, then show group bar navigation ─────
    await page.waitForSelector(".dj-score-input", { timeout: 10_000 }).catch(() => {});
    await page.waitForTimeout(600);

    const scores2 = page.locator(".dj-score-input");
    await enterScore(scores2.nth(0), 0.80);
    await page.waitForTimeout(200);
    await page.evaluate(() => window.scrollTo({ top: 80, behavior: "smooth" }));
    await page.waitForTimeout(250);
    await enterScore(scores2.nth(1), 0.92);
    if (await scores2.count() > 2) {
      await page.evaluate(() => window.scrollTo({ top: 150, behavior: "smooth" }));
      await page.waitForTimeout(250);
      await enterScore(scores2.nth(2), 0.85);
    }
    await page.waitForTimeout(400);

    // Tap group bar one more time to show project navigation / progress
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
    await page.waitForTimeout(400);
    const groupBar2 = page.locator(".dj-group-bar").first();
    if (await groupBar2.count()) {
      await groupBar2.click({ timeout: 3000 }).catch(() => {});
      await page.waitForSelector(".dj-drawer-sheet", { timeout: 4_000 }).catch(() => {});
      await page.waitForTimeout(2000); // hold on project list showing partial scores
      // Close drawer via backdrop tap
      const overlay = page.locator(".dj-drawer-overlay").first();
      if (await overlay.count()) {
        await overlay.click({ timeout: 2000 }).catch(() => {});
      } else {
        const closeDrawer = page.locator(".dj-drawer-close").first();
        if (await closeDrawer.count()) await closeDrawer.click({ timeout: 2000 }).catch(() => {});
      }
      await page.waitForTimeout(500);
    }

    // ── End scene: navigate to progress overview (all projects listed) ────
    await page.goto(`${BASE_URL}/demo/jury/progress`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('[data-testid="jury-progress-action"], .dj-prog-item, .dj-progress-list', {
      timeout: 10_000,
    }).catch(() => {});
    await page.waitForTimeout(2000); // hold showing all projects + their completion state
  } finally {
    await context.close();
    await browser.close();
  }

  return claimNewWebm(before, "_scene-jury.webm");
}

// ── Legacy desktop combo (unused; kept for reference) ────────────────────
async function _legacyRecordDesktopClip() {
  console.log("▶  Phase B: desktop clip (1440×900)…");
  const before = snapshotWebms();

  const browser = await chromium.launch({
    headless: false,
    args: ["--disable-blink-features=AutomationControlled"],
  });

  const context = await browser.newContext({
    viewport: DESKTOP_VIEWPORT,
    deviceScaleFactor: 2,
    colorScheme: "light",
    recordVideo: { dir: RECORDINGS_DIR, size: DESKTOP_RECORD_SIZE },
  });

  const page = await context.newPage();
  await seedPageState(page, { theme: "light", suppressAdminTour: true });

  try {
    // ── 0:00–0:03  Landing — held for the opening hook
    await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);

    // ── 0:03–0:07  Rankings (light) — KPI + table + hover
    await page.goto(`${BASE_URL}/demo`, { waitUntil: "domcontentloaded" });
    await page.waitForURL(/\/demo\/admin\//, { timeout: 25_000 });
    await page.goto(`${BASE_URL}/demo/admin/rankings`, { waitUntil: "domcontentloaded" });

    await page.waitForSelector('[data-testid="rankings-kpi-strip"]', { timeout: 20_000 });
    await page
      .waitForSelector("[data-testid^='rankings-row-']", { timeout: 20_000 })
      .catch(() => null);
    await page.waitForTimeout(900);

    // Hover first row + gentle scroll
    const firstRow = page.locator("[data-testid^='rankings-row-']").first();
    if (await firstRow.count()) {
      await firstRow.hover({ force: true });
      await page.waitForTimeout(700);
    }
    await page.evaluate(() => window.scrollTo({ top: 140, behavior: "smooth" }));
    await page.waitForTimeout(900);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
    await page.waitForTimeout(800);

    // ── 0:07–0:09  Theme toggle to dark — live transition
    const themeToggle = page.locator(".sb-theme-toggle").first();
    if (await themeToggle.count()) {
      await themeToggle.click();
    } else {
      await page.evaluate(() => localStorage.setItem("vera-theme", "dark"));
      await page.reload({ waitUntil: "domcontentloaded" });
    }
    await page.waitForTimeout(1900);

    // ── 0:09–0:15  Analytics (dark) — charts + attainment cards
    await page.goto(`${BASE_URL}/demo/admin/analytics`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('[data-testid="analytics-chart-container"]', { timeout: 25_000 });
    await page
      .waitForSelector("[data-testid^='analytics-att-card-']", { timeout: 15_000 })
      .catch(() => null);
    await page.waitForTimeout(900);

    // Hover an attainment card for emphasis
    const firstAtt = page.locator("[data-testid^='analytics-att-card-']").first();
    if (await firstAtt.count()) {
      await firstAtt.hover({ force: true });
      await page.waitForTimeout(1200);
    }
    // Gentle scroll to reveal more analytics content
    await page.evaluate(() => window.scrollTo({ top: 220, behavior: "smooth" }));
    await page.waitForTimeout(1400);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
    await page.waitForTimeout(900);

    // ── 0:15–0:21  Audit log (dark) — KPI + rows + final hold
    await page.goto(`${BASE_URL}/demo/admin/audit-log`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('[data-testid="audit-log-page"]', { timeout: 20_000 });
    await page
      .waitForSelector('[data-testid="audit-row"]', { timeout: 20_000 })
      .catch(() => null);
    await page.waitForTimeout(1200);
    // Hover an audit row to highlight the chain
    const firstAudit = page.locator('[data-testid="audit-row"]').first();
    if (await firstAudit.count()) {
      await firstAudit.hover({ force: true });
      await page.waitForTimeout(1000);
    }
    await page.waitForTimeout(2400);
  } finally {
    await context.close();
    await browser.close();
  }

  return claimNewWebm(before, "_clip-desktop.webm");
}

// ── Phase C: Captions + ffmpeg compose ────────────────────────────────────

/** SRT timestamp for `seconds`, e.g. 12.5 → "00:00:12,500" */
function srtTs(seconds) {
  const ms = Math.round(seconds * 1000);
  const h = String(Math.floor(ms / 3_600_000)).padStart(2, "0");
  const m = String(Math.floor((ms % 3_600_000) / 60_000)).padStart(2, "0");
  const s = String(Math.floor((ms % 60_000) / 1000)).padStart(2, "0");
  const f = String(ms % 1000).padStart(3, "0");
  return `${h}:${m}:${s},${f}`;
}

// Five-scene plan (recorded as five separate webm clips, each at native viewport).
// `durationSec` is the visible content shown in the final video; `trimStartSec`
// is how much of the clip's leading navigation overhead to skip before that
// content. Captions + titles auto-derive from cumulative timing.
const SCENES = [
  {
    name: "landing",
    fitFilter: "desktop",
    durationSec: 4.0,
    trimStartSec: 0.8,
    caption: "The hardest part of running a jury isn't the jury.",
    title: null,
  },
  {
    name: "jury",
    fitFilter: "mobile",
    durationSec: 30.0,
    trimStartSec: 4.5, // covers identity (real-name typed) → PIN → eval tour → rubric tour → all 5 scores → submit + confirm
    caption: "Score, submit, done — all from one phone.",
    title: "QR + PIN jury access",
  },
  {
    name: "heatmap",
    fitFilter: "desktop",
    durationSec: 5.0,
    trimStartSec: 3.0, // skip "No Jurors to Display" loading state → fully-populated grid
    caption: "Real-time scoring grid — light or dark.",
    title: "Live activity heatmap",
  },
  {
    name: "analytics",
    fitFilter: "desktop",
    durationSec: 5.0,
    trimStartSec: 1.4,
    caption: "Outcome attainment, ready for accreditation.",
    title: "MÜDEK / ABET attainment",
  },
  {
    name: "audit",
    fitFilter: "desktop",
    durationSec: 5.5,
    trimStartSec: 5.5, // skip nav + initial render → audit log fully populated (1395 events visible)
    caption: "Every action signed and chained.   VERA.",
    title: "Tamper-evident audit",
  },
];

/**
 * Compute [start, end, text] caption ranges by walking SCENES cumulatively.
 * `between(t,A,B)` is inclusive at both edges, so adjacent captions both
 * render at the boundary t=B=A+1. End the previous caption a hair early to
 * avoid overlap.
 */
function captionRanges() {
  const out = [];
  let t = 0;
  for (const s of SCENES) {
    if (s.caption) out.push([t, t + s.durationSec - 0.05, s.caption]);
    t += s.durationSec;
  }
  return out;
}

/** Compute [start, end, text] title ranges (with small inset for readability). */
function titleRanges() {
  const out = [];
  let t = 0;
  for (const s of SCENES) {
    if (s.title) {
      // Inset 0.4s on each end so the title fades in/out within the scene.
      const a = t + 0.4;
      const b = t + s.durationSec - 0.4;
      if (b > a) out.push([a, b, s.title]);
    }
    t += s.durationSec;
  }
  return out;
}

function writeCaptionsSrt() {
  const ranges = captionRanges();
  const srt = ranges
    .map(([a, b, txt], i) => `${i + 1}\n${srtTs(a)} --> ${srtTs(b)}\n${txt}\n`)
    .join("\n");
  const path = join(RECORDINGS_DIR, "_captions.srt");
  writeFileSync(path, srt, "utf8");
  console.log(`✓  _captions.srt`);
  return path;
}

/**
 * Escape a string for use inside ffmpeg drawtext text=... when chained in -vf.
 *
 * Key gotcha discovered the hard way: the standard `\'` escape for an
 * apostrophe inside a `'...'`-wrapped value silently breaks subsequent filters
 * in a `-vf` chain. The chain parser appears to treat the escaped apostrophe
 * as terminating the value, swallowing whatever follows. Replacing ASCII `'`
 * with U+2019 (right single quotation mark) sidesteps the bug entirely AND
 * is typographically correct (curly quotes are the right form for English).
 *
 * Other escapes:
 *   - `\` → `\\`
 *   - `:` → `\:` (filter option separator)
 *   - `,` → `\,` (filter chain separator)
 *   - `%` → `\%` (drawtext expansion sigil)
 */
function dtEscape(s) {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "’") // ASCII apostrophe → typographic right single quote
    .replace(/:/g, "\\:")
    .replace(/,/g, "\\,")
    .replace(/%/g, "\\%");
}

/** Escape for use inside force_style after subtitles= filter (single-quoted shell). */
function shEscape(s) {
  return s.replace(/'/g, `'\\''`);
}

/**
 * Two-pass compose:
 *   Pass 1 — trim each scene clip (skip nav overhead) → scale → pad → concat → 1080×1350 mp4.
 *   Pass 2 — burn captions + scene titles onto pass 1's output via drawtext.
 *
 * The pass split exists so the SAR-mismatch and concat-buffer issues in pass 1
 * are isolated from the drawtext escaping in pass 2.
 */
function compose({ scenePaths, srtPath }) {
  console.log("▶  Phase C: ffmpeg compose (two-pass)…");
  const intermediate = join(RECORDINGS_DIR, "_intermediate.mp4");
  const out = join(RECORDINGS_DIR, "vera-linkedin-demo.mp4");

  // ── Pass 1: trim/scale/pad/concat ───────────────────────────────────────
  // Each scene clip → trim to skip nav overhead, scale, pad, normalize SAR.
  // Then concat the five normalized streams into one 1080×1350 30fps mp4.
  // Scale desktop to fill the full 1350px height, then center-crop to 1080px wide.
  // This avoids letterbox bars (which make content look tiny). 1440×900 → scaled to
  // 2400×1350, then cropped to 1080×1350 — shows the center portion of the UI.
  const fitDesktop = `scale=-2:${FINAL_H},crop=${FINAL_W}:${FINAL_H},setsar=1`;
  const fitMobile = `scale=-2:${FINAL_H}:force_original_aspect_ratio=decrease,pad=${FINAL_W}:${FINAL_H}:(ow-iw)/2:(oh-ih)/2:color=${BG},setsar=1`;

  const filterParts = [];
  const labels = [];
  SCENES.forEach((s, i) => {
    const fit = s.fitFilter === "mobile" ? fitMobile : fitDesktop;
    const a = s.trimStartSec;
    const b = s.trimStartSec + s.durationSec;
    const lbl = `s${i}`;
    filterParts.push(
      `[${i}:v]trim=start=${a}:end=${b},setpts=PTS-STARTPTS,${fit}[${lbl}]`
    );
    labels.push(`[${lbl}]`);
  });
  filterParts.push(
    `${labels.join("")}concat=n=${SCENES.length}:v=1:a=0,fps=30,format=yuv420p[v]`
  );
  const pass1Filter = filterParts.join(";");

  console.log(`    pass 1/2: trim + scale + pad + concat ${SCENES.length} clips`);
  const inputs = [];
  scenePaths.forEach((p) => {
    inputs.push("-i", p);
  });
  runFfmpeg([
    "-y",
    ...inputs,
    "-filter_complex", pass1Filter,
    "-map", "[v]",
    "-c:v", "libx264", "-preset", "slow", "-crf", "18",
    "-pix_fmt", "yuv420p", "-r", "30", "-movflags", "+faststart", "-an",
    intermediate,
  ]);

  // ── Pass 2: captions + scene titles ────────────────────────────────────
  // If both layers are off OR ffmpeg lacks drawtext, skip pass 2 and use the
  // intermediate as the final output. The .srt is still on disk for LinkedIn's
  // separate caption-file upload path.
  const skipPass2 = (NO_CAPTIONS && NO_TITLES) || !HAS_DRAWTEXT;
  if (skipPass2) {
    if (!HAS_DRAWTEXT && (!NO_CAPTIONS || !NO_TITLES)) {
      console.warn(
        "⚠️   This ffmpeg build has no `drawtext` filter (missing libfreetype).\n" +
          "    Producing the video without burned-in text. Upload `_captions.srt`\n" +
          "    to LinkedIn as a separate caption file, OR install a full-featured\n" +
          "    ffmpeg via:  brew tap homebrew-ffmpeg/ffmpeg && \\\n" +
          "                 brew install homebrew-ffmpeg/ffmpeg/ffmpeg"
      );
    }
    renameSync(intermediate, out);
    console.log(`✅  ${out}`);
    return out;
  }

  // Build a chain of vfilters (-vf) — single-input, no filtergraph headaches.
  const vf = [];

  // ffmpeg filter chain syntax:
  //   - `,` separates filters in the chain → backslash-escape inside values
  //   - `:` separates options of one filter → backslash-escape inside values
  //   - `'` is a soft quote ffmpeg strips when parsing → useful for grouping
  // Args go through spawnSync (no shell), so backslashes reach ffmpeg unchanged.
  //
  // Both layers use drawtext so the entire chain is one filter type — no
  // libass / force_style escaping headaches. The .srt is still written and
  // kept on disk for LinkedIn's separate caption-file upload option.

  if (!NO_CAPTIONS) {
    captionRanges().forEach(([a, b, txt]) => {
      vf.push(
        `drawtext=fontfile=${FONT_FILE}` +
          `:text='${dtEscape(txt)}'` +
          `:fontcolor=white:fontsize=34` +
          `:box=1:boxcolor=black@0.72:boxborderw=20` +
          `:x=(w-text_w)/2:y=h-150` +
          `:enable=between(t\\,${a}\\,${b})`
      );
    });
  }

  if (!NO_TITLES) {
    titleRanges().forEach(([a, b, txt]) => {
      vf.push(
        `drawtext=fontfile=${FONT_FILE}` +
          `:text='${dtEscape(txt)}'` +
          `:fontcolor=white:fontsize=52` +
          `:shadowcolor=black@0.6:shadowx=2:shadowy=2` +
          `:x=(w-text_w)/2:y=110` +
          `:enable=between(t\\,${a}\\,${b})`
      );
    });
  }

  console.log("    pass 2/2: burn captions + titles");
  // Dump the vf chain to a file for diagnostics + manual replay.
  const vfDumpPath = join(RECORDINGS_DIR, "_vf-chain.txt");
  writeFileSync(vfDumpPath, vf.join(",\n"), "utf8");
  console.log(`    vf chain dumped → ${vfDumpPath}`);
  runFfmpeg([
    "-y",
    "-i", intermediate,
    "-vf", vf.join(","),
    "-c:v", "libx264", "-preset", "slow", "-crf", "18",
    "-pix_fmt", "yuv420p", "-r", "30", "-movflags", "+faststart", "-an",
    out,
  ]);

  console.log(`✅  ${out}`);
  return out;
}

// ── Main ──────────────────────────────────────────────────────────────────
const SKIP_RECORD = args.has("--skip-record"); // skip ALL scene recordings (use existing)

async function main() {
  const scenePaths = SCENES.map((s) =>
    join(RECORDINGS_DIR, `_scene-${s.name}.webm`)
  );

  if (!SKIP_RECORD) {
    // Smart-skip: if a scene's clip already exists on disk, reuse it.
    // Delete a single _scene-<name>.webm to force only that scene to re-record.
    const exists = (i) => existsSync(scenePaths[i]);
    const allExist = scenePaths.every((_, i) => exists(i));

    let storageState = null;
    // Only pre-warm storageState if at least one admin scene needs to record.
    const needsStorageState = !exists(2) || !exists(3) || !exists(4);
    if (needsStorageState) storageState = await prewarmAdminStorageState();

    if (!exists(0)) await recordSceneLanding();
    else console.log("⏭  scene 1 (landing) — reusing existing clip");
    if (!exists(1)) await recordMobileClip();
    else console.log("⏭  scene 2 (jury) — reusing existing clip");
    if (!exists(2)) await recordSceneHeatmap(storageState);
    else console.log("⏭  scene 3 (heatmap) — reusing existing clip");
    if (!exists(3)) await recordSceneAnalytics(storageState);
    else console.log("⏭  scene 4 (analytics) — reusing existing clip");
    if (!exists(4)) await recordSceneAudit(storageState);
    else console.log("⏭  scene 5 (audit) — reusing existing clip");

    if (allExist) {
      console.log("ℹ  all scene clips present — pass --force-record-all to override or delete one to re-record");
    }
  }

  // Verify all clips are on disk (either freshly recorded or carried over)
  for (const p of scenePaths) {
    if (!existsSync(p)) {
      console.error(`❌  Missing clip: ${p}`);
      process.exit(1);
    }
  }

  const srtPath = writeCaptionsSrt();

  if (!SKIP_COMPOSE) compose({ scenePaths, srtPath });
  else console.log("⏭  --skip-compose — ffmpeg step skipped.");

  console.log("\nDone. Upload recordings/vera-linkedin-demo.mp4 to LinkedIn.");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
