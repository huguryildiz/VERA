import { describe, expect } from "vitest";
import { qaTest } from "../../../test/qaTest.js";
import { abbrCriterionLabel } from "../criterionAbbr.js";

describe("criterionAbbr — abbrCriterionLabel", () => {
  qaTest("criterion.abbr.01", () => {
    // Two-word labels → uppercase initials of both words
    expect(abbrCriterionLabel("Technical Content")).toBe("TC");
    expect(abbrCriterionLabel("Written Communication")).toBe("WC");
    expect(abbrCriterionLabel("Oral Communication")).toBe("OC");

    // Single-word label → single initial
    expect(abbrCriterionLabel("Teamwork")).toBe("T");

    // Only the first two letter-leading words are used
    expect(abbrCriterionLabel("Data Analysis & Reporting")).toBe("DA");

    // Decorated column label "Label (30)" drops the trailing numeric token
    expect(abbrCriterionLabel("Technical Content (30)")).toBe("TC");

    // Null / empty input → empty string (no throw)
    expect(abbrCriterionLabel("")).toBe("");
    expect(abbrCriterionLabel(null)).toBe("");
    expect(abbrCriterionLabel(undefined)).toBe("");
  });
});
