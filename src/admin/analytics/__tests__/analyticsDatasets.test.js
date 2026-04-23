import { describe, expect, vi } from "vitest";
import { qaTest } from "../../../test/qaTest.js";

vi.mock("@/charts", () => ({
  CHART_COPY: {
    outcomeByGroup: { title: "Outcome by Group", note: "" },
    programmeAverages: { title: "Programme Averages", note: "" },
    periodTrend: { title: "Trend", note: "" },
    jurorConsistency: { title: "Juror Consistency", note: "" },
    achievementDistribution: { title: "Achievement Distribution", note: "" },
  },
}));

import {
  buildOutcomes,
  getCriterionColor,
  formatOutcomeCodes,
  outcomeCodeLine,
  computeOverallAvg,
  buildAttainmentStatusDataset,
  buildThresholdGapDataset,
  buildGroupHeatmapDataset,
} from "../analyticsDatasets.js";

describe("admin/analytics/analyticsDatasets", () => {
  qaTest("analytics.datasets.01", () => {
    const criteria = [
      {
        id: "c1",
        key: "technical",
        label: "Technical",
        shortLabel: "Tech",
        max: 30,
        rubric: [{ level: "Excellent" }],
        outcomes: ["PO1", "PO2"],
      },
    ];
    const result = buildOutcomes(criteria);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: "c1",
      key: "technical",
      label: "Tech",
      max: 30,
      rubric: [{ level: "Excellent" }],
      code: "PO1/PO2",
    });
  });

  qaTest("analytics.datasets.02", () => {
    expect(buildOutcomes(null)).toEqual([]);
    expect(buildOutcomes(undefined)).toEqual([]);
    expect(buildOutcomes([])).toEqual([]);
  });

  qaTest("analytics.datasets.03", () => {
    const criteria = [
      { id: "c1", color: "#3b82f6" },
      { id: "c2", color: "#8b5cf6" },
    ];
    expect(getCriterionColor("c1", "#fallback", criteria)).toBe("#3b82f6");
    expect(getCriterionColor("c2", "#fallback", criteria)).toBe("#8b5cf6");
  });

  qaTest("analytics.datasets.04", () => {
    const criteria = [{ id: "c1", color: "#3b82f6" }];
    expect(getCriterionColor("missing", "#fallback", criteria)).toBe("#fallback");
    expect(getCriterionColor("c1", "#fallback", [])).toBe("#fallback");
  });

  qaTest("analytics.datasets.05", () => {
    expect(formatOutcomeCodes("PO1/PO2/PO3")).toBe("PO1 / PO2 / PO3");
    expect(formatOutcomeCodes("PO1 / PO2")).toBe("PO1 / PO2");
    expect(formatOutcomeCodes(" PO1 / PO2 ")).toBe("PO1 / PO2");
  });

  qaTest("analytics.datasets.06", () => {
    expect(formatOutcomeCodes(null)).toBe("");
    expect(formatOutcomeCodes("")).toBe("");
    expect(formatOutcomeCodes(undefined)).toBe("");
  });

  qaTest("analytics.datasets.07", () => {
    expect(outcomeCodeLine("PO1/PO2")).toBe("(PO1 / PO2)");
    expect(outcomeCodeLine("PO1")).toBe("(PO1)");
  });

  qaTest("analytics.datasets.08", () => {
    expect(outcomeCodeLine("")).toBe("");
    expect(outcomeCodeLine(null)).toBe("");
  });

  qaTest("analytics.datasets.09", () => {
    const outcomes = [{ key: "technical", max: 30 }];
    // avg = (24+18)/2 = 21; 21/30 * 100 = 70; fmt1(70) = 70
    const data = [{ technical: 24 }, { technical: 18 }];
    expect(computeOverallAvg(data, outcomes)).toBe(70);
  });

  qaTest("analytics.datasets.10", () => {
    expect(computeOverallAvg([], [{ key: "technical", max: 30 }])).toBeNull();
    expect(computeOverallAvg(null, [])).toBeNull();
  });

  qaTest("analytics.datasets.11", () => {
    const activeOutcomes = [
      { key: "technical", id: "c1", max: 30, outcomes: ["PO1"] },
    ];
    const submittedData = [
      { technical: 27 }, // 90% >= 70% → Met
      { technical: 27 },
      { technical: 27 },
    ];
    const result = buildAttainmentStatusDataset({ submittedData, activeOutcomes, threshold: 70 });
    expect(result.sheet).toBe("Attainment Status");
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0][0]).toBe("PO1");
    expect(result.rows[0][3]).toBe("Met");
    expect(result.summary.metCount).toBe(1);
  });

  qaTest("analytics.datasets.12", () => {
    const result = buildAttainmentStatusDataset({});
    expect(result.sheet).toBe("Attainment Status");
    expect(result.rows).toEqual([]);
    expect(result.summary).toEqual({ metCount: 0, totalCount: 0 });
  });

  qaTest("analytics.datasets.13", () => {
    const activeOutcomes = [
      { key: "technical", id: "c1", max: 30, outcomes: ["PO1"] },
    ];
    const submittedData = [{ technical: 18 }]; // 60%; gap = 60-70 = -10
    const result = buildThresholdGapDataset({ submittedData, activeOutcomes, threshold: 70 });
    expect(result.sheet).toBe("Threshold Gap");
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0][0]).toBe("PO1");
    expect(result.rows[0][2]).toBe(60);
    expect(result.rows[0][3]).toBe(-10);
  });

  qaTest("analytics.datasets.14", () => {
    const result = buildGroupHeatmapDataset({ dashboardStats: [], activeOutcomes: [], threshold: 70 });
    expect(result.sheet).toBe("Group Heatmap");
    expect(result.rows).toEqual([]);
    expect(result.headers).toEqual(["Group"]);
  });
});
