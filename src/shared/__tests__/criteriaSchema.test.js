import { describe, expect } from "vitest";
import { qaTest } from "../../test/qaTest.js";
import {
  rubricBandSchema,
  criterionTemplateSchema,
  criteriaTemplateSchema,
} from "../schemas/criteriaSchema.js";

const validBand = { level: "Excellent", min: 85, max: 100, desc: "Outstanding work" };
const validBandWithRange = { ...validBand, range: "85-100" };

const validCriterion = {
  key: "technical",
  label: "Technical",
  shortLabel: "Tech",
  color: "#3b82f6",
  max: 40,
  blurb: "Technical quality of the project",
  outcomes: ["PO1", "PO2"],
  rubric: [validBand],
};

describe("schemas/criteriaSchema", () => {
  qaTest("schema.criteria.01", () => {
    expect(() => rubricBandSchema.parse(validBand)).not.toThrow();
    expect(() => rubricBandSchema.parse(validBandWithRange)).not.toThrow();
    // min/max accept strings too
    expect(() => rubricBandSchema.parse({ ...validBand, min: "85", max: "100" })).not.toThrow();
    // desc can be empty string
    expect(() => rubricBandSchema.parse({ ...validBand, desc: "" })).not.toThrow();
  });

  qaTest("schema.criteria.02", () => {
    // Missing level → throws
    expect(() => rubricBandSchema.parse({ min: 0, max: 100, desc: "ok" })).toThrow();
    // Empty level string → throws (min(1))
    expect(() => rubricBandSchema.parse({ ...validBand, level: "" })).toThrow();
    // Missing min → throws
    expect(() => rubricBandSchema.parse({ level: "A", max: 100, desc: "ok" })).toThrow();
  });

  qaTest("schema.criteria.03", () => {
    const result = criterionTemplateSchema.safeParse(validCriterion);
    expect(result.success).toBe(true);
    // outcomes can be empty array
    expect(() =>
      criterionTemplateSchema.parse({ ...validCriterion, outcomes: [] })
    ).not.toThrow();
    // rubric can be empty array
    expect(() =>
      criterionTemplateSchema.parse({ ...validCriterion, rubric: [] })
    ).not.toThrow();
  });

  qaTest("schema.criteria.04", () => {
    // max=0 → below min(1)
    expect(() =>
      criterionTemplateSchema.parse({ ...validCriterion, max: 0 })
    ).toThrow();
    // max > 100 → above max(100)
    expect(() =>
      criterionTemplateSchema.parse({ ...validCriterion, max: 101 })
    ).toThrow();
    // empty key → min(1)
    expect(() =>
      criterionTemplateSchema.parse({ ...validCriterion, key: "" })
    ).toThrow();
    // empty label → min(1)
    expect(() =>
      criterionTemplateSchema.parse({ ...validCriterion, label: "" })
    ).toThrow();
    // non-integer max → .int() rejects
    expect(() =>
      criterionTemplateSchema.parse({ ...validCriterion, max: 40.5 })
    ).toThrow();
  });

  qaTest("schema.criteria.05", () => {
    const criteria = [
      { ...validCriterion, key: "technical", max: 60 },
      { ...validCriterion, key: "design", max: 40 },
    ];
    const result = criteriaTemplateSchema.safeParse(criteria);
    expect(result.success).toBe(true);
  });

  qaTest("schema.criteria.06", () => {
    const criteria = [
      { ...validCriterion, key: "technical", max: 50 },
      { ...validCriterion, key: "design", max: 30 },
    ];
    const result = criteriaTemplateSchema.safeParse(criteria);
    expect(result.success).toBe(false);
    const messages = result.error.issues.map((i) => i.message);
    expect(messages.some((m) => m.includes("total 100"))).toBe(true);
  });

  qaTest("schema.criteria.07", () => {
    const result = criteriaTemplateSchema.safeParse([]);
    expect(result.success).toBe(false);
    const messages = result.error.issues.map((i) => i.message);
    expect(messages.some((m) => m.includes("one criterion"))).toBe(true);
  });
});
