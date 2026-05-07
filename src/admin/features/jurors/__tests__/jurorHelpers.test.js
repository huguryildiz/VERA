import { describe, expect } from "vitest";
import { qaTest } from "../../../../test/qaTest.js";

import { vi } from "vitest";
vi.mock("@/shared/lib/dateUtils", () => ({
  formatDateTime: vi.fn((ts) => (ts ? "2025-01-01 12:00" : "")),
}));

import {
  formatEditWindowLeft,
  isEditWindowActive,
  getLiveOverviewStatus,
  formatEditWindowText,
  getJurorCell,
  groupBarColor,
  groupTextClass,
  mobileScoreStyle,
} from "../components/jurorHelpers.js";

describe("jurorHelpers — color, class, score style, edit window", () => {
  qaTest("juror.helpers.01", () => {
    const NOW = Date.now();
    const future = new Date(NOW + 3_600_000).toISOString(); // 1h from now
    const past   = new Date(NOW - 3_600_000).toISOString(); // 1h ago

    // ── groupBarColor ─────────────────────────────────────────
    expect(groupBarColor(0, 0)).toBe("var(--text-tertiary)");   // total=0
    expect(groupBarColor(5, 5)).toBe("var(--success)");          // all done
    expect(groupBarColor(6, 5)).toBe("var(--success)");          // scored >= total
    expect(groupBarColor(3, 5)).toBe("var(--warning)");          // partial
    expect(groupBarColor(0, 5)).toBe("var(--text-tertiary)");    // none

    // ── groupTextClass ────────────────────────────────────────
    expect(groupTextClass(0, 0)).toBe("jurors-table-groups jt-zero");
    expect(groupTextClass(5, 5)).toBe("jurors-table-groups jt-done");
    expect(groupTextClass(3, 5)).toBe("jurors-table-groups jt-partial");
    expect(groupTextClass(0, 5)).toBe("jurors-table-groups jt-zero");

    // ── mobileScoreStyle ──────────────────────────────────────
    expect(mobileScoreStyle(null)).toEqual({ color: "#475569" });
    expect(mobileScoreStyle(undefined)).toEqual({ color: "#475569" });
    expect(mobileScoreStyle("bad")).toEqual({ color: "#475569" }); // NaN
    expect(mobileScoreStyle(90)).toEqual({ color: "#34d399" });    // ≥90
    expect(mobileScoreStyle(95)).toEqual({ color: "#34d399" });
    expect(mobileScoreStyle(74)).toEqual({ color: "#60a5fa" });    // ≥74
    expect(mobileScoreStyle(80)).toEqual({ color: "#60a5fa" });
    expect(mobileScoreStyle(60)).toEqual({ color: "#fb923c" });    // ≥60
    expect(mobileScoreStyle(73)).toEqual({ color: "#fb923c" });
    expect(mobileScoreStyle(59)).toEqual({ color: "#475569" });    // <60
    expect(mobileScoreStyle(0)).toEqual({ color: "#475569" });

    // ── formatEditWindowLeft ──────────────────────────────────
    expect(formatEditWindowLeft(null)).toBe("");
    expect(formatEditWindowLeft("not-a-date")).toBe("");

    // Expired
    expect(formatEditWindowLeft(past, NOW)).toBe("window expired");

    // Seconds left
    const soonMs = NOW + 45_000;
    const soonTs = new Date(soonMs).toISOString();
    expect(formatEditWindowLeft(soonTs, NOW)).toMatch(/s left/);

    // Minutes left (no hours)
    const minsTs = new Date(NOW + 30 * 60_000).toISOString();
    expect(formatEditWindowLeft(minsTs, NOW)).toMatch(/m left/);

    // Hours + minutes left
    const hoursTs = new Date(NOW + 2 * 3_600_000 + 15 * 60_000).toISOString();
    expect(formatEditWindowLeft(hoursTs, NOW)).toMatch(/2h 15m left/);

    // ── isEditWindowActive ────────────────────────────────────
    expect(isEditWindowActive(null)).toBe(false);
    expect(isEditWindowActive("invalid")).toBe(false);
    expect(isEditWindowActive(past, NOW)).toBe(false);
    expect(isEditWindowActive(future, NOW)).toBe(true);

    // ── getLiveOverviewStatus ─────────────────────────────────
    // Non-editing statuses pass through
    expect(getLiveOverviewStatus({ overviewStatus: "completed" })).toBe("completed");
    expect(getLiveOverviewStatus({ overviewStatus: "not_started" })).toBe("not_started");
    expect(getLiveOverviewStatus(null)).toBe("not_started"); // default

    // editing + active window → "editing"
    const editingActive = { overviewStatus: "editing", editExpiresAt: future };
    expect(getLiveOverviewStatus(editingActive, NOW)).toBe("editing");

    // editing + expired window → "completed"
    const editingExpired = { overviewStatus: "editing", editExpiresAt: past };
    expect(getLiveOverviewStatus(editingExpired, NOW)).toBe("completed");

    // ── formatEditWindowText ──────────────────────────────────
    expect(formatEditWindowText({ editExpiresAt: future }, NOW)).toMatch(/\(.+\)/);
    // "window expired" is truthy → still wrapped in parens
    expect(formatEditWindowText({ editExpiresAt: past }, NOW)).toMatch(/window expired/);
    // null expiry → formatEditWindowLeft returns "" → empty string
    expect(formatEditWindowText({ editExpiresAt: null }, NOW)).toBe("");

    // ── getJurorCell ──────────────────────────────────────────
    const juror = {
      juryName: "Alice Smith",
      overviewScoredProjects: 3,
      overviewTotalProjects: 5,
      jurorId: "j1",
      overviewStatus: "in_progress",
      lastSeenAt: "2025-06-01T00:00:00Z",
    };
    const avgMap = new Map([["j1", 82.5]]);

    expect(getJurorCell(juror, "name", avgMap)).toBe("Alice Smith");
    expect(getJurorCell(juror, "progress", avgMap)).toBe("3 of 5");
    expect(getJurorCell(juror, "avgScore", avgMap)).toBe(82.5);
    expect(getJurorCell(juror, "status", avgMap)).toBe("in_progress");
    expect(typeof getJurorCell(juror, "lastActive", avgMap)).toBe("string");
    expect(getJurorCell(juror, "unknown_key", avgMap)).toBe("");

    // avgScore: jurorId not in map → "—"
    expect(getJurorCell({ jurorId: "missing" }, "avgScore", avgMap)).toBe("—");
  });
});
