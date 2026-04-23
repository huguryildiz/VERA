import { describe, expect } from "vitest";
import { qaTest } from "../../../../test/qaTest.js";

import {
  formatRelative,
  getPeriodState,
  SETUP_REQUIRED_TOTAL,
  computeSetupPercent,
  computeRingModel,
} from "../components/periodHelpers.js";

describe("periodHelpers — computeSetupPercent + computeRingModel", () => {
  qaTest("period.helpers.01", () => {
    // ── SETUP_REQUIRED_TOTAL ──────────────────────────────────
    expect(SETUP_REQUIRED_TOTAL).toBe(6);

    // ── computeSetupPercent ───────────────────────────────────
    expect(computeSetupPercent(null)).toBeNull();
    expect(computeSetupPercent(undefined)).toBeNull();

    // ok:true → 100%
    expect(computeSetupPercent({ ok: true })).toBe(100);

    // 0 required issues → all 6 satisfied → 100%
    expect(computeSetupPercent({ ok: false, issues: [] })).toBe(100);

    // 3 required issues → 3 satisfied → 50%
    const threeRequired = {
      ok: false,
      issues: [
        { severity: "required" },
        { severity: "required" },
        { severity: "required" },
        { severity: "warning" }, // non-required, ignored
      ],
    };
    expect(computeSetupPercent(threeRequired)).toBe(50);

    // 6 required issues → 0 satisfied → 0%
    const allMissing = {
      ok: false,
      issues: Array(6).fill({ severity: "required" }),
    };
    expect(computeSetupPercent(allMissing)).toBe(0);

    // 1 required → 5 satisfied → Math.round(5/6*100) = 83
    const oneRequired = { ok: false, issues: [{ severity: "required" }] };
    expect(computeSetupPercent(oneRequired)).toBe(83);

    // ── computeRingModel ──────────────────────────────────────

    // closed → 100%, "DONE"
    const closed = computeRingModel({ state: "closed", readiness: null, stats: null });
    expect(closed.percent).toBe(100);
    expect(closed.label).toBe("DONE");
    expect(closed.stateClass).toBe("ring-closed");

    // live with stats.progress
    const liveWith = computeRingModel({ state: "live", readiness: null, stats: { progress: 75 } });
    expect(liveWith.percent).toBe(75);
    expect(liveWith.label).toBe("EVAL");
    expect(liveWith.stateClass).toBe("ring-live");

    // live without stats → percent=null
    const liveNull = computeRingModel({ state: "live", readiness: null, stats: null });
    expect(liveNull.percent).toBeNull();
    expect(liveNull.label).toBe("EVAL");

    // published → 0%, "EVAL"
    const published = computeRingModel({ state: "published", readiness: null, stats: null });
    expect(published.percent).toBe(0);
    expect(published.label).toBe("EVAL");
    expect(published.stateClass).toBe("ring-live");

    // draft_ready → computeSetupPercent(readiness), "SETUP"
    const readyRd = { ok: true };
    const draftReady = computeRingModel({ state: "draft_ready", readiness: readyRd, stats: null });
    expect(draftReady.percent).toBe(100);
    expect(draftReady.label).toBe("SETUP");
    expect(draftReady.stateClass).toBe("ring-draft");

    // draft_incomplete → partial %
    const incompleteRd = { ok: false, issues: [{ severity: "required" }, { severity: "required" }] };
    const draftIncomplete = computeRingModel({ state: "draft_incomplete", readiness: incompleteRd, stats: null });
    expect(draftIncomplete.percent).toBe(Math.round((4 / 6) * 100));
    expect(draftIncomplete.label).toBe("SETUP");

    // ── formatRelative (already partially covered — verify key branches) ──
    expect(formatRelative(null)).toBe("—");
    expect(formatRelative("")).toBe("—");
    const recentTs = new Date(Date.now() - 30_000).toISOString();
    expect(formatRelative(recentTs)).toBe("just now");
    const minutesAgo = new Date(Date.now() - 5 * 60_000).toISOString();
    expect(formatRelative(minutesAgo)).toBe("5m ago");

    // ── getPeriodState ────────────────────────────────────────
    expect(getPeriodState({ closed_at: "2025-01-01" }, false, null)).toBe("closed");
    expect(getPeriodState({ closed_at: null, is_locked: true }, true, null)).toBe("live");
    expect(getPeriodState({ closed_at: null, is_locked: true }, false, null)).toBe("published");
    expect(getPeriodState({ closed_at: null, is_locked: false }, false, { ok: true })).toBe("draft_ready");
    expect(getPeriodState({ closed_at: null, is_locked: false }, false, { ok: false })).toBe("draft_incomplete");
    expect(getPeriodState({ closed_at: null, is_locked: false }, false, null)).toBe("draft_incomplete");
  });
});
