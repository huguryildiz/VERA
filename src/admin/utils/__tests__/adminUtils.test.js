import { describe, expect, it } from "vitest";
import { qaTest } from "../../../test/qaTest.js";
import {
  parseCsv,
  toNum,
  tsToMillis,
  cmp,
  rowKey,
  jurorBg,
  jurorDot,
  adminCompletionPct,
  dedupeAndSort,
  buildPeriodSearchText,
  buildTimestampSearchText,
  formatTs,
} from "../adminUtils.js";

describe("admin/utils/adminUtils — parseCsv", () => {
  qaTest("admin.utils.01", () => {
    const rows = parseCsv("a,b,c\n1,2,3");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual(["a", "b", "c"]);
    expect(rows[1]).toEqual(["1", "2", "3"]);
  });

  qaTest("admin.utils.02", () => {
    // Semicolon delimiter
    const rows = parseCsv('name;age\n"Doe, Jane";30');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual(["name", "age"]);
    expect(rows[1]).toEqual(["Doe, Jane", "30"]);

    // Empty text
    expect(parseCsv("")).toEqual([]);
  });
});

describe("admin/utils/adminUtils — toNum", () => {
  qaTest("admin.utils.03", () => {
    expect(toNum("42")).toBe(42);
    expect(toNum('"3.14"')).toBe(3.14);
    expect(toNum("1,5")).toBe(1.5);
    expect(toNum("abc")).toBe(0);
    expect(toNum(null)).toBe(0);
    expect(toNum(undefined)).toBe(0);
    expect(toNum(7)).toBe(7);
  });
});

describe("admin/utils/adminUtils — tsToMillis", () => {
  qaTest("admin.utils.04", () => {
    // ISO datetime
    const iso = "2025-06-15T12:00:00";
    const ms = tsToMillis(iso);
    expect(ms).toBeGreaterThan(0);

    // EU dot format
    const euDot = "15.06.2025 14:30";
    const euMs = tsToMillis(euDot);
    expect(euMs).toBeGreaterThan(0);
    expect(new Date(euMs).getMonth()).toBe(5); // June = 5

    // Null / empty
    expect(tsToMillis(null)).toBe(0);
    expect(tsToMillis("")).toBe(0);
  });
});

describe("admin/utils/adminUtils — formatTs", () => {
  qaTest("admin.utils.05", () => {
    expect(formatTs(null)).toBe("—");
    expect(formatTs("")).toBe("—");
    // Stored dot format returned as-is
    expect(formatTs("15.06.2025 14:30")).toBe("15.06.2025 14:30");
    // With seconds — stripped to HH:mm
    expect(formatTs("15.06.2025 14:30:00")).toBe("15.06.2025 14:30");
  });
});

describe("admin/utils/adminUtils — cmp", () => {
  qaTest("admin.utils.06", () => {
    expect(cmp(1, 2)).toBeLessThan(0);
    expect(cmp(2, 1)).toBeGreaterThan(0);
    expect(cmp(5, 5)).toBe(0);

    // String comparison (non-numeric)
    expect(cmp("apple", "banana")).toBeLessThan(0);
    expect(cmp("z", "a")).toBeGreaterThan(0);
  });
});

describe("admin/utils/adminUtils — rowKey", () => {
  qaTest("admin.utils.07", () => {
    // jurorId takes priority
    expect(rowKey({ jurorId: "abc-123", juryName: "Alice" })).toBe("abc-123");

    // Compound key fallback
    const key = rowKey({ juryName: "Alice Smith", affiliation: "MIT" });
    expect(key).toBe("alice smith__mit");

    // Missing both
    expect(rowKey({})).toBe("__");
  });
});

describe("admin/utils/adminUtils — jurorBg / jurorDot", () => {
  qaTest("admin.utils.08", () => {
    const bg = jurorBg("Alice");
    const dot = jurorDot("Alice");
    expect(bg).toMatch(/^#[0-9a-f]{6}$/i);
    expect(dot).toMatch(/^#[0-9a-f]{6}$/i);
    // Same name always produces same color
    expect(jurorBg("Alice")).toBe(bg);
    expect(jurorDot("Alice")).toBe(dot);
    // Different names produce different colors
    expect(jurorBg("Bob")).not.toBe(bg);
  });
});

describe("admin/utils/adminUtils — adminCompletionPct", () => {
  qaTest("admin.utils.09", () => {
    const rows = [
      { total: 85 },
      { total: null },
      { total: 72 },
    ];
    expect(adminCompletionPct(rows, 3)).toBe(67); // 2/3 scored
    expect(adminCompletionPct([], 0)).toBe(0);
    expect(adminCompletionPct(rows, 0)).toBe(0);
  });
});

describe("admin/utils/adminUtils — dedupeAndSort + buildPeriodSearchText", () => {
  qaTest("admin.utils.10", () => {
    // dedupeAndSort: keeps row with the most recent timestamp
    const rows = [
      { juryName: "Alice", affiliation: "MIT", projectName: "Alpha", total: 80, updatedAt: "2025-01-01T10:00:00" },
      { juryName: "Alice", affiliation: "MIT", projectName: "Alpha", total: 90, updatedAt: "2025-01-02T10:00:00" },
    ];
    const result = dedupeAndSort(rows);
    expect(result).toHaveLength(1);
    expect(result[0].total).toBe(90);

    // buildPeriodSearchText
    const text = buildPeriodSearchText("2025 Fall");
    expect(text).toContain("2025");
    expect(text).toContain("Fall");
    expect(text).toContain("2025-Fall");
  });

  it("buildTimestampSearchText returns tokens for a stored timestamp", () => {
    const text = buildTimestampSearchText("15.06.2025 14:30");
    expect(text).toContain("15.06.2025 14:30");
    expect(text).toContain("15/06/2025 14/30".split("/")[0]); // at least includes the date
  });
});
