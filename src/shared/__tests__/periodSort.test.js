import { describe, expect } from "vitest";
import { qaTest } from "../../test/qaTest.js";
import { sortPeriodsByStartDateDesc, sortPeriodsForPopover } from "../periodSort.js";

const makePeriod = (id, name, start_date, overrides = {}) => ({
  id, name, start_date, ...overrides,
});

describe("shared/periodSort — sortPeriodsByStartDateDesc", () => {
  qaTest("shared.periodSort.01", () => {
    const list = [
      makePeriod("a", "Spring 2025", "2025-02-01"),
      makePeriod("b", "Fall 2025", "2025-09-01"),
      makePeriod("c", "Spring 2026", "2026-02-01"),
    ];
    const sorted = sortPeriodsByStartDateDesc(list);
    expect(sorted.map((p) => p.id)).toEqual(["c", "b", "a"]);
  });

  qaTest("shared.periodSort.02", () => {
    const list = [
      makePeriod("a", "Spring 2025", "2025-02-01"),
      makePeriod("b", "No Date", null),
    ];
    const sorted = sortPeriodsByStartDateDesc(list);
    expect(sorted[0].id).toBe("a");
    expect(sorted[1].id).toBe("b");
  });

  qaTest("shared.periodSort.03", () => {
    expect(sortPeriodsByStartDateDesc([])).toEqual([]);
    expect(sortPeriodsByStartDateDesc(null)).toEqual([]);
  });
});

describe("shared/periodSort — sortPeriodsForPopover", () => {
  const periods = [
    makePeriod("1", "Alpha", "2025-01-01"),
    makePeriod("2", "Beta", "2025-06-01"),
    makePeriod("3", "Gamma", "2026-01-01"),
  ];

  qaTest("shared.periodSort.04", () => {
    const result = sortPeriodsForPopover(periods, null);
    expect(result).toHaveProperty("pinned");
    expect(result).toHaveProperty("recent");
    expect(result).toHaveProperty("all");
    expect(Array.isArray(result.recent)).toBe(true);
    expect(Array.isArray(result.all)).toBe(true);
  });

  qaTest("shared.periodSort.05", () => {
    const result = sortPeriodsForPopover(periods, "2");
    expect(result.pinned).not.toBeNull();
    expect(result.pinned.id).toBe("2");
    const recentIds = result.recent.map((p) => p.id);
    expect(recentIds).not.toContain("2");
  });

  qaTest("shared.periodSort.06", () => {
    const many = Array.from({ length: 10 }, (_, i) =>
      makePeriod(String(i), `Period ${i}`, `2025-0${(i % 9) + 1}-01`)
    );
    const result = sortPeriodsForPopover(many, null, 3);
    expect(result.recent.length).toBeLessThanOrEqual(3);
  });
});
