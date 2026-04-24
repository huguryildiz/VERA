import { test, expect } from "@playwright/test";
import {
  setupOutcomeFixture,
  teardownOutcomeFixture,
  readAttainment,
  deleteMapping,
  type OutcomeFixture,
} from "../helpers/outcomeFixture";

/**
 * E1 — outcome attainment math correctness (MÜDEK / ABET).
 *
 * VERA's accreditation reports are derived from `getOutcomeAttainmentTrends`
 * ([src/shared/api/admin/scores.js:259-345](src/shared/api/admin/scores.js#L259-L345)).
 * For every evaluation row, attainment per outcome = Σ(raw/max × 100 × weight) / Σ weight,
 * then averaged across evaluations. Wrong math here = wrong accreditation report =
 * institutional risk. Before E1 this formula had **zero** test coverage.
 *
 * These tests build isolated periods with known criteria/outcomes/mappings/scores,
 * then read attainment from the DB through `readAttainment` (which mirrors the
 * production formula verbatim) and assert the math holds.
 */
test.describe("outcome attainment math correctness", () => {
  test.describe.configure({ mode: "serial" });

  let fixture: OutcomeFixture | null = null;

  test.afterEach(async () => {
    await teardownOutcomeFixture(fixture);
    fixture = null;
  });

  test("single criterion full weight → attainment = (raw/max)*100", async () => {
    fixture = await setupOutcomeFixture({
      criteriaWeights: [{ key: "C1", weight: 100, max: 10 }],
      outcomeMappings: [{ outcomeCode: "OA", criterionKey: "C1", weight: 1.0 }],
      scores: [{ key: "C1", value: 8 }],
      namePrefix: "E1 T1",
    });

    const result = await readAttainment(fixture.periodId);
    // (8/10) * 100 * 1.0 / 1.0 = 80.0
    expect(result["OA"]).toBeCloseTo(80, 1);
  });

  test("two criteria weighted → attainment = weighted avg", async () => {
    fixture = await setupOutcomeFixture({
      criteriaWeights: [
        { key: "C1", weight: 30, max: 10 },
        { key: "C2", weight: 70, max: 10 },
      ],
      outcomeMappings: [
        { outcomeCode: "OA", criterionKey: "C1", weight: 0.3 },
        { outcomeCode: "OA", criterionKey: "C2", weight: 0.7 },
      ],
      scores: [
        { key: "C1", value: 10 },
        { key: "C2", value: 5 },
      ],
      namePrefix: "E1 T2",
    });

    const result = await readAttainment(fixture.periodId);
    // ((10/10)*100*0.3 + (5/10)*100*0.7) / (0.3 + 0.7) = (30 + 35) / 1.0 = 65.0
    expect(result["OA"]).toBeCloseTo(65, 1);
  });

  test("shared criterion across two outcomes → independent attainments", async () => {
    fixture = await setupOutcomeFixture({
      criteriaWeights: [{ key: "C1", weight: 100, max: 10 }],
      outcomeMappings: [
        { outcomeCode: "OA", criterionKey: "C1", weight: 1.0 },
        { outcomeCode: "OB", criterionKey: "C1", weight: 0.5 },
      ],
      scores: [{ key: "C1", value: 6 }],
      namePrefix: "E1 T3",
    });

    const result = await readAttainment(fixture.periodId);
    // OA: (6/10)*100*1.0 / 1.0 = 60.0
    // OB: (6/10)*100*0.5 / 0.5 = 60.0 (weight normalizes away in single-contributor case)
    expect(result["OA"]).toBeCloseTo(60, 1);
    expect(result["OB"]).toBeCloseTo(60, 1);
  });

  test("deliberately-break: removing a mapping changes attainment", async () => {
    fixture = await setupOutcomeFixture({
      criteriaWeights: [
        { key: "C1", weight: 50, max: 10 },
        { key: "C2", weight: 50, max: 10 },
      ],
      outcomeMappings: [
        { outcomeCode: "OA", criterionKey: "C1", weight: 0.5 },
        { outcomeCode: "OA", criterionKey: "C2", weight: 0.5 },
      ],
      scores: [
        { key: "C1", value: 10 }, // 100% on C1
        { key: "C2", value: 5 },  // 50% on C2
      ],
      namePrefix: "E1 T4",
    });

    const before = await readAttainment(fixture.periodId);
    // ((10/10)*100*0.5 + (5/10)*100*0.5) / (0.5+0.5) = (50 + 25) / 1.0 = 75.0
    expect(before["OA"]).toBeCloseTo(75, 1);

    // Pull the weaker criterion out of the mapping. Remaining contributor is
    // C1 with score 10/10 → attainment must jump to 100.
    await deleteMapping(fixture, "OA", "C2");

    const after = await readAttainment(fixture.periodId);
    expect(after["OA"]).toBeCloseTo(100, 1);

    // Strong guarantee: removing a mapping MUST move the number. If a future
    // refactor accidentally ignores the weight table, this assertion fails.
    expect(after["OA"]).not.toBeCloseTo(before["OA"], 1);
  });
});
