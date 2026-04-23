import { describe, expect } from "vitest";
import { qaTest } from "../../../test/qaTest.js";
import {
  computeCoverage,
  computePending,
  computeSpread,
} from "../reviewsKpiHelpers.js";

describe("reviewsKpiHelpers — computeCoverage", () => {
  qaTest("reviews.kpi.01", () => {
    // No assigned jurors → dash
    expect(computeCoverage([], [])).toEqual({ display: "—", completed: 0, total: 0 });
    expect(computeCoverage([], null)).toEqual({ display: "—", completed: 0, total: 0 });

    const assignedJurors = [{ jurorId: "j1" }, { jurorId: "j2" }, { jurorId: "j3" }];

    // 2 of 3 completed
    const kpiBase = [
      { jurorId: "j1", jurorStatus: "completed" },
      { jurorId: "j2", jurorStatus: "completed" },
      { jurorId: "j3", jurorStatus: "in_progress" },
    ];
    const result = computeCoverage(kpiBase, assignedJurors);
    expect(result.completed).toBe(2);
    expect(result.total).toBe(3);
    expect(result.display).toBe("2 / 3");

    // Duplicate rows for same juror — deduped by Set
    const kpiDupe = [
      { jurorId: "j1", jurorStatus: "completed" },
      { jurorId: "j1", jurorStatus: "completed" },
    ];
    const r2 = computeCoverage(kpiDupe, assignedJurors);
    expect(r2.completed).toBe(1);
  });
});

describe("reviewsKpiHelpers — computePending", () => {
  qaTest("reviews.kpi.02", () => {
    const rows = [
      { jurorId: "j1", jurorStatus: "ready_to_submit" },
      { jurorId: "j2", jurorStatus: "ready_to_submit" },
      { jurorId: "j1", jurorStatus: "ready_to_submit" }, // duplicate — deduped
      { jurorId: "j3", jurorStatus: "completed" },
    ];
    expect(computePending(rows)).toBe(2);
    expect(computePending([])).toBe(0);

    // Uses juryName fallback when jurorId missing
    const byName = [
      { juryName: "Alice", jurorStatus: "ready_to_submit" },
      { juryName: "Alice", jurorStatus: "ready_to_submit" },
      { juryName: "Bob",   jurorStatus: "ready_to_submit" },
    ];
    expect(computePending(byName)).toBe(2);
  });
});

describe("reviewsKpiHelpers — computeSpread", () => {
  qaTest("reviews.kpi.03", () => {
    // Single juror per project → excluded → returns "—"
    const singleJuror = [
      { jurorStatus: "completed", total: 80, projectId: "p1" },
    ];
    expect(computeSpread(singleJuror)).toBe("—");

    // Empty → "—"
    expect(computeSpread([])).toBe("—");

    // 2 jurors for same project: [80, 60] → mean=70, var=100, σ=10
    const twoJurors = [
      { jurorStatus: "completed", total: 80, projectId: "p1" },
      { jurorStatus: "completed", total: 60, projectId: "p1" },
    ];
    const spread = computeSpread(twoJurors);
    expect(Number(spread)).toBeCloseTo(10, 1);

    // Non-completed jurors excluded
    const mixed = [
      { jurorStatus: "completed",   total: 80, projectId: "p2" },
      { jurorStatus: "in_progress", total: 40, projectId: "p2" },
    ];
    // Only 1 completed for p2 → excluded → "—"
    expect(computeSpread(mixed)).toBe("—");

    // null total excluded
    const nullTotal = [
      { jurorStatus: "completed", total: null, projectId: "p3" },
      { jurorStatus: "completed", total: 70,   projectId: "p3" },
    ];
    expect(computeSpread(nullTotal)).toBe("—");
  });
});
