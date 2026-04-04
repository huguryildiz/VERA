import { describe, expect } from "vitest";
import { getCellState, getPartialTotal, jurorStatusMeta } from "../utils/scoreHelpers";
import { qaTest } from "../../test/qaTest.js";

describe("scoreHelpers — Phase A safety", () => {
  // phaseA.helpers.01 — getCellState with custom criteria
  qaTest("phaseA.helpers.01", () => {
    const customCriteria = [
      { id: "research", label: "Research", max: 40 },
      { id: "presentation", label: "Presentation", max: 60 },
    ];

    // One criterion filled, one null, no total → "partial"
    expect(
      getCellState(
        { research: 30, presentation: null, total: null },
        customCriteria
      )
    ).toBe("partial");

    // Both criteria filled and total present → "scored"
    expect(
      getCellState(
        { research: 30, presentation: 50, total: 80 },
        customCriteria
      )
    ).toBe("scored");

    // All null → "empty"
    expect(
      getCellState(
        { research: null, presentation: null, total: null },
        customCriteria
      )
    ).toBe("empty");
  });

  // phaseA.helpers.02 — getPartialTotal with all-null / falsy entries
  qaTest("phaseA.helpers.02", () => {
    const allNull = {
      technical: null,
      design: null,
      delivery: null,
      teamwork: null,
    };

    // All-null entry: must return 0, not NaN
    const result = getPartialTotal(allNull);
    expect(result).toBe(0);
    expect(Number.isNaN(result)).toBe(false);

    // null entry
    expect(getPartialTotal(null)).toBe(0);

    // undefined entry
    expect(getPartialTotal(undefined)).toBe(0);
  });

  // phaseA.helpers.03 — jurorStatusMeta completeness
  qaTest("phaseA.helpers.03", () => {
    const workflowStates = [
      "completed",
      "ready_to_submit",
      "in_progress",
      "not_started",
      "editing",
    ];
    const cellStates = ["scored", "partial", "empty"];
    const allStates = [...workflowStates, ...cellStates];

    for (const state of allStates) {
      const entry = jurorStatusMeta[state];
      expect(entry, `jurorStatusMeta["${state}"] must exist`).toBeDefined();
      expect(
        typeof entry.label,
        `jurorStatusMeta["${state}"].label must be a string`
      ).toBe("string");
      expect(
        typeof entry.icon,
        `jurorStatusMeta["${state}"].icon must be a function`
      ).toBe("function");
      expect(
        typeof entry.colorClass,
        `jurorStatusMeta["${state}"].colorClass must be a string`
      ).toBe("string");
    }
  });
});
