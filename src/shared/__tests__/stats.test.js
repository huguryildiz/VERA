import { describe, expect } from "vitest";
import { qaTest } from "../../test/qaTest.js";
import { mean, stdDev, quantile, buildBoxplotStats, fmt1, fmt2 } from "../stats.js";

describe("shared/stats — mean", () => {
  qaTest("shared.stats.01", () => {
    expect(mean([2, 4, 6])).toBe(4);
    expect(mean([1, 2, 3, 4, 5])).toBe(3);
  });

  qaTest("shared.stats.02", () => {
    expect(mean([])).toBe(0);
  });
});

describe("shared/stats — stdDev", () => {
  qaTest("shared.stats.03", () => {
    const data = [2, 4, 4, 4, 5, 5, 7, 9];
    const pop = stdDev(data, false);
    const sam = stdDev(data, true);
    expect(pop).toBeCloseTo(2, 0);
    expect(sam).toBeGreaterThan(pop);
  });

  qaTest("shared.stats.04", () => {
    expect(stdDev([42])).toBe(0);
    expect(stdDev([])).toBe(0);
  });
});

describe("shared/stats — quantile", () => {
  qaTest("shared.stats.05", () => {
    const sorted = [1, 2, 3, 4, 5];
    expect(quantile(sorted, 0.5)).toBe(3);
  });

  qaTest("shared.stats.06", () => {
    expect(quantile([], 0.5)).toBe(0);
    // single element
    expect(quantile([7], 0.5)).toBe(7);
    expect(quantile([7], 0.75)).toBe(7);
  });
});

describe("shared/stats — buildBoxplotStats", () => {
  qaTest("shared.stats.07", () => {
    const sorted = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const result = buildBoxplotStats(sorted);
    expect(result).not.toBeNull();
    expect(result).toHaveProperty("q1");
    expect(result).toHaveProperty("med");
    expect(result).toHaveProperty("q3");
    expect(result).toHaveProperty("iqr");
    expect(result).toHaveProperty("whiskerMin");
    expect(result).toHaveProperty("whiskerMax");
    expect(result).toHaveProperty("outliers");
    expect(Array.isArray(result.outliers)).toBe(true);
    expect(result.q1).toBeLessThan(result.med);
    expect(result.med).toBeLessThan(result.q3);
  });

  qaTest("shared.stats.08", () => {
    expect(buildBoxplotStats([])).toBeNull();
  });
});

describe("shared/stats — fmt1 / fmt2", () => {
  qaTest("shared.stats.09", () => {
    expect(fmt1(3.456)).toBe(3.5);
    expect(fmt2(3.456)).toBe(3.46);
    expect(fmt1(NaN)).toBeNull();
    expect(fmt2(Infinity)).toBeNull();
    expect(fmt1(0)).toBe(0);
  });
});
