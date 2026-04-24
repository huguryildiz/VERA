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
