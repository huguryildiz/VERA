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

/** Run ffmpeg with array args (no shell escaping). Throws on non-zero exit. */
function runFfmpeg(args) {
  const result = spawnSync("ffmpeg", args, { stdio: "inherit" });
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
  const filters = execSync("ffmpeg -hide_banner -filters", { encoding: "utf8" });
  HAS_DRAWTEXT = /\bdrawtext\b/.test(filters);
} catch {
  HAS_DRAWTEXT = false;
}

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

// ── Phase A: Mobile clip (jury QR+PIN+scoring) ────────────────────────────
async function recordMobileClip() {
  console.log("▶  Phase A: mobile clip (393×852)…");
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
    recordVideo: { dir: RECORDINGS_DIR, size: MOBILE_VIEWPORT },
  });

  const page = await context.newPage();
  await seedPageState(page, { theme: "dark", suppressJuryTours: true });

  try {
    // Token gate → arrival redirect (skip token-verification dwell, go fast)
    await page.goto(`${BASE_URL}/demo/eval?t=${ENTRY_TOKEN}`, { waitUntil: "domcontentloaded" });
    await page.waitForURL(/\/demo\/jury\/(arrival|identity)/, { timeout: 25_000 });
    await page.waitForTimeout(400);

    // Arrival → Identity
    const arrival = page.getByTestId("jury-arrival-step");
    if (await arrival.count()) await arrival.click();

    await page.waitForSelector('[data-testid="jury-name-input"]', { timeout: 15_000 });
    await page.waitForTimeout(300);

    // Identity quickly — not the focus of the scene
    await page.locator('[data-testid="jury-name-input"]').fill("Prof. Ayşe Kaya");
    await page.waitForTimeout(200);
    await page.locator('[data-testid="jury-affiliation-input"]').fill("ODTÜ / Bilgisayar Müh.");
    await page.waitForTimeout(400);
    await page.locator('[data-testid="jury-identity-submit"]').click();

    // PIN reveal — visually striking, HOLD long for the camera
    await page.waitForURL(/\/demo\/jury\/pin-reveal/, { timeout: 20_000 });
    await page.waitForTimeout(3200); // 3.2s on PIN reveal — the marquee shot

    const beginBtn = page.locator(".pr-tour-begin, button:has-text('Begin Evaluation')").first();
    if (await beginBtn.count()) await beginBtn.click();

    // Progress → Evaluate
    await page.waitForURL(/\/demo\/jury\/progress/, { timeout: 25_000 });
    await page.waitForTimeout(500);
    await page.getByTestId("jury-progress-action").click();

    await page.waitForURL(/\/demo\/jury\/evaluate/, { timeout: 20_000 });
    await page.waitForSelector(".dj-score-input", { timeout: 15_000 });
    await page.waitForTimeout(800);

    // Fill three scores with deliberate cinematic typing
    const scores = page.locator(".dj-score-input");
    const count = await scores.count();
    const values = ["82", "78", "91"];
    for (let i = 0; i < Math.min(count, values.length); i += 1) {
      await scores.nth(i).click();
      await page.waitForTimeout(280);
      // Type each digit individually for cinematic effect
      for (const ch of values[i]) {
        await page.keyboard.type(ch);
        await page.waitForTimeout(120);
      }
      await scores.nth(i).dispatchEvent("blur");
      await page.waitForTimeout(550);
      if (i === 1) {
        await page.evaluate(() => window.scrollTo({ top: 280, behavior: "smooth" }));
        await page.waitForTimeout(550);
      }
    }

    // Hold the final scoring shot
    await page.waitForTimeout(1200);
  } finally {
    await context.close();
    await browser.close();
  }

  return claimNewWebm(before, "_clip-jury.webm");
}

// ── Phase B: Desktop clip (landing → admin light → toggle → analytics → audit) ─
async function recordDesktopClip() {
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
    recordVideo: { dir: RECORDINGS_DIR, size: DESKTOP_VIEWPORT },
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

// Final video timeline (~29s). Captions span the full duration with no gaps.
const CAPTION_LINES = [
  [0.0, 3.0, "The hardest part of running a jury isn't the jury."],
  [3.0, 11.0, "Jurors scan, enter a PIN, score on their phone."],
  [11.0, 15.0, "Watch project rankings update in real time."],
  [15.0, 17.0, "Polished for every workspace — light or dark."],
  [17.0, 23.0, "Outcome attainment, ready for accreditation."],
  [23.0, 29.0, "Every action signed and chained.   VERA."],
];

// Scene titles overlay the upper third for ~3s each.
const SCENE_TITLES = [
  [4.0, 10.0, "QR + PIN jury access"],
  [11.5, 14.5, "Live rankings"],
  [15.2, 16.8, "Light or dark"],
  [17.5, 22.0, "MÜDEK / ABET attainment"],
  [23.5, 28.0, "Tamper-evident audit"],
];

function writeCaptionsSrt() {
  const srt = CAPTION_LINES.map(
    ([a, b, txt], i) => `${i + 1}\n${srtTs(a)} --> ${srtTs(b)}\n${txt}\n`
  ).join("\n");
  const path = join(RECORDINGS_DIR, "_captions.srt");
  writeFileSync(path, srt, "utf8");
  console.log(`✓  _captions.srt`);
  return path;
}

/** Escape a string for use inside ffmpeg drawtext text=... */
function dtEscape(s) {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/:/g, "\\:")
    .replace(/%/g, "\\%");
}

/** Escape for use inside force_style after subtitles= filter (single-quoted shell). */
function shEscape(s) {
  return s.replace(/'/g, `'\\''`);
}

/**
 * Two-pass compose:
 *   Pass 1 — trim / scale / pad / concat the two webm clips into a clean 1080×1350 mp4.
 *   Pass 2 — burn captions (subtitles filter) and scene titles (drawtext) onto pass 1's output.
 *
 * The split exists because libass's `force_style` value contains commas, which the
 * filtergraph parser ALSO uses as a chain separator. Putting subtitles in its own
 * pass sidesteps the escaping nightmare entirely.
 */
function compose({ juryWebm, desktopWebm, srtPath }) {
  console.log("▶  Phase C: ffmpeg compose (two-pass)…");
  const intermediate = join(RECORDINGS_DIR, "_intermediate.mp4");
  const out = join(RECORDINGS_DIR, "vera-linkedin-demo.mp4");

  // ── Pass 1: trim/scale/pad/concat ───────────────────────────────────────
  // Desktop (1440×900) → scale to width=1080 → pad to 1350 height.
  // Mobile (393×852)  → scale to height=1350 → pad to 1080 width.
  // Final ~29s timeline:
  //   Desktop[0:3]   → landing (3s)
  //   Mobile[3:11]   → PIN reveal + scoring, skipping the token redirect (8s)
  //   Desktop[3:21]  → rankings light → toggle → analytics → audit (18s)
  // setsar=1 normalizes Sample Aspect Ratio so concat doesn't reject mismatched inputs.
  const fitDesktop = `scale=${FINAL_W}:-2:force_original_aspect_ratio=decrease,pad=${FINAL_W}:${FINAL_H}:(ow-iw)/2:(oh-ih)/2:color=${BG},setsar=1`;
  const fitMobile = `scale=-2:${FINAL_H}:force_original_aspect_ratio=decrease,pad=${FINAL_W}:${FINAL_H}:(ow-iw)/2:(oh-ih)/2:color=${BG},setsar=1`;
  const pass1Filter = [
    `[0:v]trim=0:3,setpts=PTS-STARTPTS,${fitDesktop}[d_intro]`,
    `[1:v]trim=start=3:end=11,setpts=PTS-STARTPTS,${fitMobile}[d_jury]`,
    `[0:v]trim=start=3:end=21,setpts=PTS-STARTPTS,${fitDesktop}[d_admin]`,
    `[d_intro][d_jury][d_admin]concat=n=3:v=1:a=0,fps=30,format=yuv420p[v]`,
  ].join(";");

  console.log("    pass 1/2: scale + pad + concat (~20s)");
  runFfmpeg([
    "-y",
    "-i", desktopWebm,
    "-i", juryWebm,
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
    // Bottom-band captions — single source of truth in CAPTION_LINES.
    CAPTION_LINES.forEach(([a, b, txt]) => {
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
    SCENE_TITLES.forEach(([a, b, txt]) => {
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

  console.log("    pass 2/2: burn captions + titles (~20s)");
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
async function main() {
  let juryWebm = join(RECORDINGS_DIR, "_clip-jury.webm");
  let desktopWebm = join(RECORDINGS_DIR, "_clip-desktop.webm");

  if (!SKIP_MOBILE) juryWebm = await recordMobileClip();
  else if (!existsSync(juryWebm)) {
    console.error(`❌  --skip-mobile but ${juryWebm} not found.`);
    process.exit(1);
  }

  if (!SKIP_DESKTOP) desktopWebm = await recordDesktopClip();
  else if (!existsSync(desktopWebm)) {
    console.error(`❌  --skip-desktop but ${desktopWebm} not found.`);
    process.exit(1);
  }

  const srtPath = writeCaptionsSrt();

  if (!SKIP_COMPOSE) compose({ juryWebm, desktopWebm, srtPath });
  else console.log("⏭  --skip-compose — ffmpeg step skipped.");

  console.log("\nDone. Upload recordings/vera-linkedin-demo.mp4 to LinkedIn.");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
