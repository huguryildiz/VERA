import { describe, expect } from "vitest";
import { qaTest } from "../../../../test/qaTest.js";

import { vi } from "vitest";
vi.mock("@/shared/lib/dateUtils", () => ({
  formatDateTime: vi.fn((ts) => (ts ? "2025-01-01 12:00" : "")),
}));

import {
  COLUMNS,
  getProjectCell,
  membersToArray,
  membersToString,
  scoreBandToken,
} from "../components/projectHelpers.js";

describe("projectHelpers — membersToArray, membersToString, scoreBandToken, getProjectCell", () => {
  qaTest("project.helpers.01", () => {
    // ── COLUMNS structure ─────────────────────────────────────
    expect(COLUMNS).toHaveLength(5);
    const keys = COLUMNS.map((c) => c.key);
    expect(keys).toContain("group_no");
    expect(keys).toContain("title");
    expect(keys).toContain("members");
    expect(keys).toContain("avg_score");
    expect(keys).toContain("updated_at");

    // ── membersToArray ────────────────────────────────────────
    expect(membersToArray(null)).toEqual([]);
    expect(membersToArray(undefined)).toEqual([]);
    expect(membersToArray("")).toEqual([]);

    // Array of strings
    expect(membersToArray(["Alice", "Bob"])).toEqual(["Alice", "Bob"]);
    // Array of objects with .name
    expect(membersToArray([{ name: "Alice" }, { name: "Bob" }])).toEqual(["Alice", "Bob"]);
    // Mixed: object + string
    expect(membersToArray([{ name: "Alice" }, "Bob"])).toEqual(["Alice", "Bob"]);

    // CSV string
    expect(membersToArray("Alice, Bob, Carol")).toEqual(["Alice", "Bob", "Carol"]);
    // Semicolon-delimited
    expect(membersToArray("Alice;Bob")).toEqual(["Alice", "Bob"]);
    // Newline-delimited
    expect(membersToArray("Alice\nBob")).toEqual(["Alice", "Bob"]);
    // Trims whitespace, filters empty
    expect(membersToArray("  Alice ,  Bob  ,  ")).toEqual(["Alice", "Bob"]);

    // Non-array, non-string → []
    expect(membersToArray(42)).toEqual([]);

    // ── membersToString ───────────────────────────────────────
    expect(membersToString(null)).toBe("");
    expect(membersToString(["Alice", "Bob"])).toBe("Alice, Bob");
    expect(membersToString("Alice;Bob")).toBe("Alice, Bob");

    // ── scoreBandToken ────────────────────────────────────────
    expect(scoreBandToken(null, 100)).toBe("var(--text-tertiary)");
    expect(scoreBandToken(undefined, 100)).toBe("var(--text-tertiary)");
    expect(scoreBandToken("bad", 100)).toBe("var(--text-tertiary)"); // non-numeric

    // ≥85% → success
    expect(scoreBandToken(85, 100)).toBe("var(--success)");
    expect(scoreBandToken(100, 100)).toBe("var(--success)");
    expect(scoreBandToken(34, 40)).toBe("var(--success)"); // 85% of 40

    // ≥70% < 85% → warning
    expect(scoreBandToken(70, 100)).toBe("var(--warning)");
    expect(scoreBandToken(28, 40)).toBe("var(--warning)"); // 70% of 40

    // <70% → danger
    expect(scoreBandToken(69, 100)).toBe("var(--danger)");
    expect(scoreBandToken(0, 100)).toBe("var(--danger)");
    // default max=100 when max is 0
    expect(scoreBandToken(90, 0)).toBe("var(--success)");

    // ── getProjectCell ────────────────────────────────────────
    const project = {
      group_no: 3,
      title: "Team Alpha",
      members: ["Alice", "Bob"],
      id: "p1",
      updated_at: "2025-06-01T00:00:00Z",
    };
    const avgMap = new Map([["p1", 88]]);

    expect(getProjectCell(project, "group_no", avgMap)).toBe(3);
    expect(getProjectCell(project, "title", avgMap)).toBe("Team Alpha");
    expect(getProjectCell(project, "members", avgMap)).toBe("Alice, Bob");
    expect(getProjectCell(project, "avg_score", avgMap)).toBe(88);
    expect(typeof getProjectCell(project, "updated_at", avgMap)).toBe("string");
    expect(getProjectCell(project, "unknown_key", avgMap)).toBe("");

    // avg_score: project not in map → "—"
    expect(getProjectCell({ id: "missing" }, "avg_score", avgMap)).toBe("—");

    // updated_at: null → formatFull returns "" → "—"
    expect(getProjectCell({ id: "p1", updated_at: null }, "updated_at", avgMap)).toBe("—");
  });
});
