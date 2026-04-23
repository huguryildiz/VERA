import { describe, expect, it } from "vitest";
import { qaTest } from "../../test/qaTest.js";
import {
  validateRubric,
  validateCriterion,
  validatePeriodCriteria,
  isDisposableEmptyDraftCriterion,
} from "../criteriaValidation.js";

const makeBand = (level, min, max, desc = "") => ({ level, min, max, desc });

describe("shared/criteriaValidation — validateRubric", () => {
  qaTest("criteria.val.01", () => {
    const result = validateRubric([], 30);
    expect(result.coverageError).toBe("Add at least one band");
    expect(Object.keys(result.bandRangeErrors)).toHaveLength(0);
    expect(Object.keys(result.bandLevelErrors)).toHaveLength(0);
  });

  qaTest("criteria.val.02", () => {
    const rubric = [
      makeBand("Excellent", 27, 30),
      makeBand("Good", 20, 26),
      makeBand("Developing", 10, 19),
      makeBand("Insufficient", 0, 9),
    ];
    const result = validateRubric(rubric, 30);
    expect(result.coverageError).toBeNull();
    expect(Object.keys(result.bandRangeErrors)).toHaveLength(0);
    expect(Object.keys(result.bandLevelErrors)).toHaveLength(0);
  });

  qaTest("criteria.val.03", () => {
    const rubric = [
      makeBand("Excellent", 0, 30),
      makeBand("Excellent", 0, 30), // exact duplicate name
    ];
    const result = validateRubric(rubric, 30);
    expect(result.bandLevelErrors[0]).toBe("Duplicate band name");
    expect(result.bandLevelErrors[1]).toBe("Duplicate band name");
  });

  qaTest("criteria.val.04", () => {
    // Bands overlap: band 0 max (15) >= band 1 min (10)
    const rubric = [
      makeBand("Good", 0, 15),
      makeBand("Excellent", 10, 30),
    ];
    const result = validateRubric(rubric, 30);
    expect(Object.keys(result.bandRangeErrors).length).toBeGreaterThan(0);
  });

  qaTest("criteria.val.05", () => {
    // Gap: [0-20] then [22-30] skips 21
    const rubric = [
      makeBand("Lower", 0, 20),
      makeBand("Upper", 22, 30),
    ];
    const result = validateRubric(rubric, 30);
    expect(result.coverageError).toContain("not fully covered");
  });
});

describe("shared/criteriaValidation — validateCriterion", () => {
  const emptyRow = { label: "", shortLabel: "", blurb: "", max: "", outcomes: [], rubric: [], _rubricTouched: false };

  qaTest("criteria.val.06", () => {
    const result = validateCriterion(emptyRow, [emptyRow], [], 0);
    expect(result.errors.label).toBe("Required");
    expect(result.errors.shortLabel).toBe("Required");
    expect(result.errors.max).toBe("Required");
  });

  qaTest("criteria.val.07", () => {
    const row1 = { label: "Technical", shortLabel: "Tech", max: "30", outcomes: [], rubric: [] };
    const row2 = { label: "Design", shortLabel: "Tech", max: "40", outcomes: [], rubric: [] };
    const result = validateCriterion(row2, [row1, row2], [], 1);
    expect(result.errors.shortLabel).toBe("Duplicate short label");
  });
});

describe("shared/criteriaValidation — validatePeriodCriteria", () => {
  qaTest("criteria.val.08", () => {
    const rows = [
      { label: "A", shortLabel: "AA", max: "60", outcomes: [], rubric: [] },
      { label: "B", shortLabel: "BB", max: "50", outcomes: [], rubric: [] },
    ];
    const result = validatePeriodCriteria(rows, []);
    expect(result.totalMax).toBe(110);
    expect(result.totalError).toBe("Total must equal 100");
  });

  it("returns null totalError when weights sum to 100", () => {
    const rows = [
      { label: "A", shortLabel: "AA", max: "60", outcomes: [], rubric: [] },
      { label: "B", shortLabel: "BB", max: "40", outcomes: [], rubric: [] },
    ];
    const result = validatePeriodCriteria(rows, []);
    expect(result.totalMax).toBe(100);
    expect(result.totalError).toBeNull();
  });
});

describe("shared/criteriaValidation — isDisposableEmptyDraftCriterion", () => {
  qaTest("criteria.val.09", () => {
    const empty = { label: "", shortLabel: "", blurb: "", max: "", outcomes: [], _rubricTouched: false };
    expect(isDisposableEmptyDraftCriterion(empty)).toBe(true);

    expect(isDisposableEmptyDraftCriterion({ ...empty, label: "X" })).toBe(false);
    expect(isDisposableEmptyDraftCriterion({ ...empty, max: "0" })).toBe(false);
    expect(isDisposableEmptyDraftCriterion({ ...empty, outcomes: ["PO1"] })).toBe(false);
    expect(isDisposableEmptyDraftCriterion({ ...empty, _rubricTouched: true })).toBe(false);
  });
});
