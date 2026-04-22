// src/admin/__tests__/analyticsDatasets.new.test.js
// Unit + integration tests for dataset builders introduced by the
// 2026-04-21 analytics exports content redesign.

import { describe, expect } from "vitest";
import { qaTest } from "../../test/qaTest.js";
import {
  buildAttainmentStatusDataset,
  buildThresholdGapDataset,
  buildGroupHeatmapDataset,
  buildOutcomes,
} from "../analytics/analyticsDatasets.js";

// ── Fixtures ──────────────────────────────────────────────────────────────
const OUTCOMES = [
  { id: "technical", key: "technical", label: "Technical", max: 30, outcomes: ["PO-1"] },
  { id: "written",   key: "written",   label: "Written",   max: 20, outcomes: ["PO-2"] },
];

const OUTCOME_LOOKUP = {
  "PO-1": { code: "PO-1", desc_en: "Engineering knowledge" },
  "PO-2": { code: "PO-2", desc_en: "Problem analysis" },
};

// 5 submission rows: 4 pass 70% on PO-1, 1 fails. On PO-2: 2 pass, 3 fail.
const SUBMITTED = [
  { projectId: "p1", technical: 27, written: 18 }, // 90%, 90%
  { projectId: "p2", technical: 25, written: 14 }, // 83%, 70%
  { projectId: "p3", technical: 22, written: 10 }, // 73%, 50%
  { projectId: "p4", technical: 21, written:  8 }, // 70%, 40%
  { projectId: "p5", technical: 15, written:  5 }, // 50%, 25%
];

describe("buildAttainmentStatusDataset", () => {
  qaTest("analytics.dataset.attainment_status.01", () => {
    const prior = {
      currentTrend: { criteriaAvgs: { technical: 22, written: 10 } },
      prevTrend:    { criteriaAvgs: { technical: 20, written: 12 } },
    };
    const ds = buildAttainmentStatusDataset({
      submittedData: SUBMITTED,
      activeOutcomes: OUTCOMES,
      threshold: 70,
      priorPeriodStats: prior,
      outcomeLookup: OUTCOME_LOOKUP,
    });

    expect(ds.sheet).toBe("Attainment Status");
    expect(ds.headers).toEqual([
      "Outcome",
      "Description",
      "Attainment Rate (%)",
      "Status",
      "Δ vs Prior Period (%)",
    ]);

    // PO-1: 4 of 5 pass → 80% → Met; delta = round((22 − 20) / 30 × 100) = 7
    // PO-2: 2 of 5 pass → 40% → Not Met; delta = round((10 − 12) / 20 × 100) = -10
    expect(ds.rows).toHaveLength(2);

    const [firstRow, secondRow] = ds.rows;
    expect(firstRow[0]).toBe("PO-1");
    expect(firstRow[1]).toBe("Engineering knowledge");
    expect(firstRow[2]).toBe(80);
    expect(firstRow[3]).toBe("Met");
    expect(firstRow[4]).toBe(7);

    expect(secondRow[0]).toBe("PO-2");
    expect(secondRow[2]).toBe(40);
    expect(secondRow[3]).toBe("Not Met");
    expect(secondRow[4]).toBe(-10);

    expect(ds.summary).toEqual({ metCount: 1, totalCount: 2 });
  });

  qaTest("analytics.dataset.attainment_status.02", () => {
    const ds = buildAttainmentStatusDataset({
      submittedData: [],
      activeOutcomes: OUTCOMES,
      threshold: 70,
    });
    expect(ds.rows.every((r) => r[2] === null)).toBe(true);
    expect(ds.rows.every((r) => r[3] === "No data")).toBe(true);
    expect(ds.summary).toEqual({ metCount: 0, totalCount: 0 });
  });

  qaTest("analytics.dataset.attainment_status.03", () => {
    const ds = buildAttainmentStatusDataset({
      submittedData: SUBMITTED,
      activeOutcomes: OUTCOMES,
      threshold: 70,
      priorPeriodStats: null,
      outcomeLookup: OUTCOME_LOOKUP,
    });
    expect(ds.headers).toEqual([
      "Outcome",
      "Description",
      "Attainment Rate (%)",
      "Status",
    ]);
    expect(ds.rows.every((r) => r.length === 4)).toBe(true);
  });
});

// ── buildThresholdGapDataset ──────────────────────────────────
describe("buildThresholdGapDataset", () => {
  qaTest("analytics.dataset.threshold_gap.01", () => {
    // Happy path: compute avg %, gap %, sort by gap ascending
    const result = buildThresholdGapDataset({
      submittedData: SUBMITTED,
      activeOutcomes: OUTCOMES,
      threshold: 70,
    });

    expect(result).toMatchObject({
      sheet: "Threshold Gap",
      title: "Threshold Gap Analysis",
      headers: ["Outcome", "Description", "Average Score (%)", "Gap vs Threshold (%)"],
    });

    // Should have 2 rows (one per outcome code: PO-1, PO-2)
    expect(result.rows).toHaveLength(2);

    // PO-1 (technical, max=30): mean([27,25,22,21,15]) = 22, avgPct = 73.3%, gapPct = 3.3
    // PO-2 (written, max=20): mean([18,14,10,8,5]) = 11, avgPct = 55.0%, gapPct = -15.0
    // Sorted by gapPct ascending: PO-2 (-15.0) first, then PO-1 (3.3)

    const [row1, row2] = result.rows;
    expect(row1[0]).toBe("PO-2"); // outcome code
    expect(row1[1]).toBe("PO-2"); // description (fallback to code when no lookup)
    expect(row1[2]).toBe(55); // avgPct = 55.0
    expect(row1[3]).toBe(-15); // gapPct = -15.0

    expect(row2[0]).toBe("PO-1");
    expect(row2[1]).toBe("PO-1");
    expect(row2[2]).toBe(73.3); // avgPct = 73.3
    expect(row2[3]).toBe(3.3); // gapPct = 3.3
  });

  qaTest("analytics.dataset.threshold_gap.02", () => {
    // Empty input: return same shape with empty rows
    const result = buildThresholdGapDataset();

    expect(result).toMatchObject({
      sheet: "Threshold Gap",
      title: "Threshold Gap Analysis",
      headers: ["Outcome", "Description", "Average Score (%)", "Gap vs Threshold (%)"],
      rows: [],
    });

    expect(result.note).toBeTruthy(); // Should have a note
    expect(result.note).toContain("70"); // Should mention default threshold
  });

  qaTest("analytics.dataset.threshold_gap.03", () => {
    // All outcomes below threshold: every gapPct should be negative
    const lowData = [
      { projectId: "p1", technical: 10, written: 5 }, // 33%, 25%
      { projectId: "p2", technical: 12, written: 6 }, // 40%, 30%
    ];
    const result = buildThresholdGapDataset({
      submittedData: lowData,
      activeOutcomes: OUTCOMES,
      threshold: 70,
    });

    expect(result.rows).toHaveLength(2);
    // All gaps must be negative
    result.rows.forEach((row) => {
      expect(row[3]).toBeLessThan(0);
    });
    // Sorted ascending: most negative first
    const gaps = result.rows.map((r) => r[3]);
    for (let i = 0; i < gaps.length - 1; i++) {
      expect(gaps[i]).toBeLessThanOrEqual(gaps[i + 1]);
    }
  });
});

// ── buildGroupHeatmapDataset ──────────────────────────────────
describe("buildGroupHeatmapDataset", () => {
  // dashboardStats format: { id, name, group_no, avg: { technical, written, ... } }
  const DASHBOARD_STATS = [
    {
      id: "g1",
      name: "Group 1",
      group_no: 1,
      count: 1,
      avg: { technical: 27, written: 18 }, // 90%, 90%
    },
    {
      id: "g2",
      name: "Group 2",
      group_no: 2,
      count: 1,
      avg: { technical: 15, written: 5 }, // 50%, 25%
    },
    {
      id: "g3",
      name: "Group 3",
      group_no: 3,
      count: 1,
      avg: { technical: 21, written: 8 }, // 70%, 40% (on threshold)
    },
  ];

  qaTest("analytics.dataset.group_heatmap.01", () => {
    // Happy path: groups as rows, outcomes as columns, normalized %, below-threshold count
    const result = buildGroupHeatmapDataset({
      dashboardStats: DASHBOARD_STATS,
      activeOutcomes: OUTCOMES,
      threshold: 70,
    });

    expect(result).toMatchObject({
      sheet: "Group Heatmap",
      title: "Group Attainment Heatmap",
      headers: ["Group", "PO-1 (%)", "PO-2 (%)", "Cells Below Threshold"],
    });

    // Should have 3 rows (one per group)
    expect(result.rows).toHaveLength(3);

    // Group 1: 90%, 90% — 0 below threshold
    const [row1, row2, row3] = result.rows;
    expect(row1[0]).toBe("Group 1");
    expect(row1[1]).toBe(90); // technical: 27/30*100 = 90
    expect(row1[2]).toBe(90); // written: 18/20*100 = 90
    expect(row1[3]).toBe(0); // none below 70%

    // Group 2: 50%, 25% — 2 below threshold
    expect(row2[0]).toBe("Group 2");
    expect(row2[1]).toBe(50); // technical: 15/30*100 = 50
    expect(row2[2]).toBe(25); // written: 5/20*100 = 25
    expect(row2[3]).toBe(2); // both below 70%

    // Group 3: 70%, 40% — 1 below threshold (70 is at threshold, not below)
    expect(row3[0]).toBe("Group 3");
    expect(row3[1]).toBe(70); // technical: 21/30*100 = 70
    expect(row3[2]).toBe(40); // written: 8/20*100 = 40
    expect(row3[3]).toBe(1); // only written below 70%
  });

  qaTest("analytics.dataset.group_heatmap.02", () => {
    // Empty input: return same shape with empty rows
    const result = buildGroupHeatmapDataset();

    expect(result).toMatchObject({
      sheet: "Group Heatmap",
      title: "Group Attainment Heatmap",
      headers: ["Group"],
      rows: [],
    });

    expect(result.note).toBeTruthy(); // Should have a note
    expect(result.note).toContain("70"); // Should mention default threshold
  });

  qaTest("analytics.dataset.group_heatmap.03", () => {
    // Groups with count=0 should be filtered out
    const filteredStats = [
      { id: "g1", name: "Group 1", group_no: 1, count: 1, avg: { technical: 27, written: 18 } },
      { id: "g-empty", name: "Empty Group", group_no: 0, count: 0, avg: { technical: 0, written: 0 } },
    ];

    const result = buildGroupHeatmapDataset({
      dashboardStats: filteredStats,
      activeOutcomes: OUTCOMES,
      threshold: 70,
    });

    // Only the group with count > 0 should appear
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0][0]).toBe("Group 1");
  });

  qaTest("analytics.dataset.group_heatmap.04", () => {
    // All cells below threshold: belowThresholdCount should equal outcome count (2)
    const allLow = [
      { id: "g1", name: "Group 1", group_no: 1, count: 1, avg: { technical: 5, written: 3 } }, // 16%, 15%
      { id: "g2", name: "Group 2", group_no: 2, count: 1, avg: { technical: 8, written: 4 } }, // 26%, 20%
    ];
    const result = buildGroupHeatmapDataset({
      dashboardStats: allLow,
      activeOutcomes: OUTCOMES,
      threshold: 70,
    });

    expect(result.rows).toHaveLength(2);
    // Last column of each row is belowThresholdCount
    // OUTCOMES has 2 outcome codes (PO-1, PO-2) → all below → count = 2
    result.rows.forEach((row) => {
      const belowCount = row[row.length - 1];
      expect(belowCount).toBe(2);
    });
  });

  qaTest("analytics.dataset.group_heatmap.05", () => {
    // Missing criterion key in g.avg must produce null, not 0% (Number(null) coercion guard)
    const sparse = [
      { id: "g1", title: "Sparse", group_no: 1, count: 1, avg: { technical: 25 } }, // no 'written' key
    ];
    const result = buildGroupHeatmapDataset({
      dashboardStats: sparse,
      activeOutcomes: OUTCOMES,
      threshold: 70,
    });

    expect(result.rows).toHaveLength(1);
    const row = result.rows[0];
    expect(row[1]).toBeCloseTo(83.3, 0); // technical: 25/30*100 = 83.3%
    expect(row[2]).toBeNull();           // written: missing key → null, NOT 0
    expect(row[3]).toBe(0);             // 83.3% is above 70% → 0 below threshold
  });
});
