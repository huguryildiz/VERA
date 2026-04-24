# Session C — Flake Log

Any test that intermittently fails gets one entry: symptom, root cause, fix, sprint of origin.

Policy reminder: a test that passes 9/10 runs is **broken** — fix the root cause, don't add retries.

---

## F1 — `--repeat-each=3` parallel worker seed collision

**Sprint:** C1 (scoring autosave)

**Symptom:** `npm run e2e -- --grep "evaluate" --repeat-each=3` intermittently failed mid-suite with juror session errors, PIN step rejections, or locked-screen assertions on the 2nd/3rd repeat. Full suite `npm run e2e` (single worker in CI) was always green.

**Root cause:** Playwright's `--repeat-each=3` without an explicit worker cap spawns **3 parallel workers** that each run the `test.describe.configure({ mode: "serial" })` suite **simultaneously**. All three workers share the same demo DB. Their `beforeEach` hooks patch the same `juror_period_auth` rows (same jurorId + periodId) at the same time, invalidating each other's live sessions mid-test.

Result: Worker 1 starts a jury session → Worker 2's `beforeEach` resets `session_token_hash` on the same row → Worker 1's request now has a stale token → test fails "not real flake, it's concurrency damage."

**Fix:**

1. Flake check command must include `--workers=1`:
   ```bash
   npm run e2e -- --grep "evaluate" --repeat-each=3 --workers=1
   ```
   This matches CI (`workers: 1`) and serializes the suite against shared DB rows.

2. **Every `beforeEach` that resets `juror_period_auth` must also null `session_token_hash`:**
   ```ts
   data: {
     failed_attempts: 0,
     locked_until: null,
     final_submitted_at: null,
     session_token_hash: null,   // ← prevents cross-test session leak
   }
   ```
   Without this, legitimately persisted sessions from previous repeats/tests pollute the next test's identity step.

**Propagation rule for future sprints:** Any C-sprint that manipulates `juror_period_auth` (C3 PIN lifecycle, C4 scoring fixture, C6 period-immutability jury path) **must:**
- Include `session_token_hash: null` in its reset payload.
- Document the flake check as `--workers=1` in its implementation report.
- Not rely on parallel-worker behavior for race validation.

**Sprint of origin:** C1 — see `implementation_reports/C1-scoring-autosave.md`.

---

## F2 — `log-export-event` Edge Function cold start timeouts rankings XLSX export

**Sprint:** C4 (scoring math correctness)

**Symptom:** `scoring-correctness.spec.ts › XLSX export total matches DB raw score sum` intermittently failed under `--repeat-each=3 --workers=1` with `page.waitForEvent("download")` timing out after 30 s. Observed once across three consecutive repeat-each=3 runs (26 / 27 = 96.3% pass rate). Screenshot at failure showed the page fully loaded, correct totals displayed (33.0 / 73.0), export panel open, XLSX selected — only the download never started.

**Root cause:** `RankingsPage.handleExport` awaits `logExportInitiated` (Edge Function `log-export-event`) **before** `downloadTable` runs. If the Edge Function cold-starts (Supabase free tier, function unused for ≥1 minute), the audit write can take 8–15 s before returning, occasionally more, pushing the total `click → download` path past Playwright's 30 s default. The existing `rankings-export.spec.ts` doesn't hit this because its CSV test runs before its XLSX test and warms the function.

**Fix:** Not fixed in C4 — this is a cross-spec concern, not a C4-local bug. The right place to address it is a shared warmup in `globalSetup` (one invocation of `log-export-event` with a no-op payload before any export test runs), so every spec that depends on it starts warm. Deferring to a follow-up cleanup sprint to avoid C4 scope creep.

**Propagation rule for future sprints:** Any new spec that exercises an Edge Function not previously called in the same test session should either (a) warm it explicitly via a non-asserted first call, or (b) raise the relevant test-level timeout with a comment pointing back here. Do **not** mask by retrying — retries hide cold-start slowness that real users also experience.

**Sprint of origin:** C4 — see `implementation_reports/C4-scoring-math.md`.

---
