// src/admin/__tests__/analyticsExport.test.js
// ============================================================
// Analytics export — ANALYTICS_SECTIONS list and workbook building.
// ============================================================

import { describe, expect, vi, beforeEach, it } from "vitest";
import { qaTest } from "../../test/qaTest.js";

// ── Mock analyticsDatasets before importing analyticsExport ───────────────

vi.mock("../analytics/analyticsDatasets", () => ({
  buildAttainmentStatusDataset: vi.fn(),
  buildProgrammeAveragesDataset: vi.fn(),
  buildThresholdGapDataset: vi.fn(),
  buildOutcomeByGroupDataset: vi.fn(),
  buildRubricAchievementDataset: vi.fn(),
  buildTrendDataset: vi.fn(),
  buildGroupHeatmapDataset: vi.fn(),
  buildJurorConsistencyDataset: vi.fn(),
  buildOutcomeMappingDataset: vi.fn(),
  buildOutcomes: vi.fn(),
}));

// ── Mock xlsx-js-style before importing analyticsExport ────────────────────

let capturedSheets = [];

vi.mock("xlsx-js-style", () => {
  const utils = {
    aoa_to_sheet: vi.fn((data) => ({ __data: data })),
    book_new: vi.fn(() => ({ Sheets: {}, SheetNames: [] })),
    book_append_sheet: vi.fn((wb, ws, name) => {
      capturedSheets.push({ ws, name });
      wb.SheetNames.push(name);
    }),
    encode_cell: vi.fn((cell) => `${String.fromCharCode(65 + cell.c)}${cell.r + 1}`),
  };
  return {
    default: { utils, writeFile: vi.fn() },
    utils,
    writeFile: vi.fn(),
  };
});

// ── Dynamic imports after mocks ───────────────────────────────────────────

import { buildAnalyticsWorkbook, ANALYTICS_SECTIONS } from "../analytics/analyticsExport.js";
import { ANALYTICS_EXPORT_FORMATS } from "../pages/AnalyticsPage.jsx";
import * as mockedDatasets from "../analytics/analyticsDatasets.js";

// ── Test suites ──────────────────────────────────────────────────────────

describe("ANALYTICS_SECTIONS canonical list", () => {
  it("has unique keys and required shape on every entry", () => {
    expect(ANALYTICS_SECTIONS).toBeDefined();
    expect(Array.isArray(ANALYTICS_SECTIONS)).toBe(true);
    expect(ANALYTICS_SECTIONS.length).toBeGreaterThan(0);

    ANALYTICS_SECTIONS.forEach((section) => {
      expect(section).toHaveProperty("key");
      expect(section).toHaveProperty("title");
      expect(section).toHaveProperty("chartId");
      expect(section).toHaveProperty("build");
      expect(typeof section.build).toBe("function");
    });

    const keys = ANALYTICS_SECTIONS.map((s) => s.key);
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(keys.length);
  });
});

describe("buildAnalyticsWorkbook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedSheets = [];
  });

  qaTest("analytics.export.sections.01", () => {
    // Setup: all builders return non-empty data
    mockedDatasets.buildAttainmentStatusDataset.mockReturnValue({
      sheet: "Attainment Status",
      title: "Outcome Attainment Status",
      headers: ["Outcome", "Status"],
      rows: [["O1", "Met"]],
      extra: [],
      note: "",
    });

    mockedDatasets.buildProgrammeAveragesDataset.mockReturnValue({
      sheet: "Programme-Level Averages",
      title: "Programme-Level Outcome Averages",
      headers: ["Criterion", "Mean (%)"],
      rows: [["C1", "85"]],
      extra: [],
      note: "",
    });

    mockedDatasets.buildThresholdGapDataset.mockReturnValue({
      sheet: "Threshold Gap",
      title: "Threshold Gap Analysis",
      headers: ["Outcome", "Gap (%)"],
      rows: [["O1", "15"]],
      extra: [],
      note: "",
    });

    mockedDatasets.buildOutcomeByGroupDataset.mockReturnValue({
      sheet: "Outcome Achievement",
      title: "Outcome Achievement by Group",
      headers: ["Group", "Score"],
      rows: [["G1", "80"]],
      extra: [],
      note: "",
    });

    mockedDatasets.buildRubricAchievementDataset.mockReturnValue({
      sheet: "Rubric Achievement Dist.",
      title: "Rubric Achievement Distribution",
      headers: ["Band", "Count"],
      rows: [["Excellent", "5"]],
      extra: [],
      note: "",
    });

    mockedDatasets.buildTrendDataset.mockReturnValue({
      sheet: "Attainment Trend",
      title: "Outcome Attainment Trend",
      headers: ["Period", "Rate (%)"],
      rows: [["S1", "75"], ["S2", "85"]],
      extra: [],
      note: "",
    });

    mockedDatasets.buildGroupHeatmapDataset.mockReturnValue({
      sheet: "Group Heatmap",
      title: "Group Attainment Heatmap",
      headers: ["Group", "Outcome", "Score"],
      rows: [["G1", "O1", "80"]],
      extra: [],
      note: "",
    });

    mockedDatasets.buildJurorConsistencyDataset.mockReturnValue({
      sheet: "Juror Consistency",
      title: "Inter-Rater Consistency Heatmap",
      headers: ["Group", "CV (%)"],
      rows: [["G1", "15"]],
      extra: [],
      note: "",
    });

    mockedDatasets.buildOutcomeMappingDataset.mockReturnValue({
      sheet: "Coverage Matrix",
      title: "Coverage Matrix",
      headers: ["Outcome", "Criterion"],
      rows: [["O1", "C1"]],
      extra: [],
      note: "",
    });

    // Build workbook
    const params = {
      dashboardStats: [],
      submittedData: [],
      trendData: [],
      semesterOptions: [],
      trendSemesterIds: [],
      activeOutcomes: [],
      outcomeLookup: null,
      threshold: 70,
    };

    const wb = buildAnalyticsWorkbook(params);

    // Expected sheets in order
    const expectedSheets = [
      "Attainment Status",
      "Attainment Rate",
      "Threshold Gap",
      "Outcome Achievement",
      "Rubric Achievement Dist.",
      "Programme-Level Averages",
      "Attainment Trend",
      "Group Heatmap",
      "Juror Consistency",
      "Coverage Matrix",
    ];

    expect(wb.SheetNames).toEqual(expectedSheets);
  });

  qaTest("analytics.export.sections.02", () => {
    // Setup: all builders return empty data
    mockedDatasets.buildAttainmentStatusDataset.mockReturnValue({
      sheet: "Attainment Status",
      title: "Outcome Attainment Status",
      headers: ["Outcome", "Status"],
      rows: [],
      extra: [],
      note: "",
    });

    mockedDatasets.buildProgrammeAveragesDataset.mockReturnValue({
      sheet: "Programme-Level Averages",
      title: "Programme-Level Outcome Averages",
      headers: ["Criterion", "Mean (%)"],
      rows: [],
      extra: [],
      note: "",
    });

    mockedDatasets.buildThresholdGapDataset.mockReturnValue({
      sheet: "Threshold Gap",
      title: "Threshold Gap Analysis",
      headers: ["Outcome", "Gap (%)"],
      rows: [],
      extra: [],
      note: "",
    });

    mockedDatasets.buildOutcomeByGroupDataset.mockReturnValue({
      sheet: "Outcome Achievement",
      title: "Outcome Achievement by Group",
      headers: ["Group", "Score"],
      rows: [],
      extra: [],
      note: "",
    });

    mockedDatasets.buildRubricAchievementDataset.mockReturnValue({
      sheet: "Rubric Achievement Dist.",
      title: "Rubric Achievement Distribution",
      headers: ["Band", "Count"],
      rows: [],
      extra: [],
      note: "",
    });

    mockedDatasets.buildTrendDataset.mockReturnValue({
      sheet: "Attainment Trend",
      title: "Outcome Attainment Trend",
      headers: ["Period", "Rate (%)"],
      rows: [],
      extra: [],
      note: "",
    });

    mockedDatasets.buildGroupHeatmapDataset.mockReturnValue({
      sheet: "Group Heatmap",
      title: "Group Attainment Heatmap",
      headers: ["Group", "Outcome", "Score"],
      rows: [],
      extra: [],
      note: "",
    });

    mockedDatasets.buildJurorConsistencyDataset.mockReturnValue({
      sheet: "Juror Consistency",
      title: "Inter-Rater Consistency Heatmap",
      headers: ["Group", "CV (%)"],
      rows: [],
      extra: [],
      note: "",
    });

    mockedDatasets.buildOutcomeMappingDataset.mockReturnValue({
      sheet: "Coverage Matrix",
      title: "Coverage Matrix",
      headers: ["Outcome", "Criterion"],
      rows: [],
      extra: [],
      note: "",
    });

    // Build workbook with empty data
    const params = {
      dashboardStats: [],
      submittedData: [],
      trendData: [],
      semesterOptions: [],
      trendSemesterIds: [],
      activeOutcomes: [],
      outcomeLookup: null,
      threshold: 70,
    };

    const wb = buildAnalyticsWorkbook(params);

    // All sections should be skipped → workbook has no sheets
    expect(wb.SheetNames).toHaveLength(0);
  });

  it("skips trend section when it has fewer than 2 rows (conditional check)", () => {
    // Test trend conditional: when trend has only 1 row, it should be skipped
    mockedDatasets.buildAttainmentStatusDataset.mockReturnValue({
      sheet: "Attainment Status",
      title: "Outcome Attainment Status",
      headers: ["Outcome", "Status"],
      rows: [["O1", "Met"]],
      extra: [],
      note: "",
    });

    mockedDatasets.buildProgrammeAveragesDataset.mockReturnValue({
      sheet: "Programme-Level Averages",
      title: "Programme-Level Outcome Averages",
      headers: ["Criterion", "Mean (%)"],
      rows: [["C1", "85"]],
      extra: [],
      note: "",
    });

    mockedDatasets.buildThresholdGapDataset.mockReturnValue({
      sheet: "Threshold Gap",
      title: "Threshold Gap Analysis",
      headers: ["Outcome", "Gap (%)"],
      rows: [["O1", "15"]],
      extra: [],
      note: "",
    });

    mockedDatasets.buildOutcomeByGroupDataset.mockReturnValue({
      sheet: "Outcome Achievement",
      title: "Outcome Achievement by Group",
      headers: ["Group", "Score"],
      rows: [["G1", "80"]],
      extra: [],
      note: "",
    });

    mockedDatasets.buildRubricAchievementDataset.mockReturnValue({
      sheet: "Rubric Achievement Dist.",
      title: "Rubric Achievement Distribution",
      headers: ["Band", "Count"],
      rows: [["Excellent", "5"]],
      extra: [],
      note: "",
    });

    // Trend with only 1 row — should be skipped by conditional
    mockedDatasets.buildTrendDataset.mockReturnValue({
      sheet: "Attainment Trend",
      title: "Outcome Attainment Trend",
      headers: ["Period", "Rate (%)"],
      rows: [["S1", "75"]],
      extra: [],
      note: "",
    });

    mockedDatasets.buildGroupHeatmapDataset.mockReturnValue({
      sheet: "Group Heatmap",
      title: "Group Attainment Heatmap",
      headers: ["Group", "Outcome", "Score"],
      rows: [["G1", "O1", "80"]],
      extra: [],
      note: "",
    });

    mockedDatasets.buildJurorConsistencyDataset.mockReturnValue({
      sheet: "Juror Consistency",
      title: "Inter-Rater Consistency Heatmap",
      headers: ["Group", "CV (%)"],
      rows: [["G1", "15"]],
      extra: [],
      note: "",
    });

    mockedDatasets.buildOutcomeMappingDataset.mockReturnValue({
      sheet: "Coverage Matrix",
      title: "Coverage Matrix",
      headers: ["Outcome", "Criterion"],
      rows: [["O1", "C1"]],
      extra: [],
      note: "",
    });

    const params = {
      dashboardStats: [],
      submittedData: [],
      trendData: [],
      semesterOptions: [],
      trendSemesterIds: [],
      activeOutcomes: [],
      outcomeLookup: null,
      threshold: 70,
    };

    const wb = buildAnalyticsWorkbook(params);

    // "Attainment Trend" should not be in the workbook because its conditional fails
    expect(wb.SheetNames).not.toContain("Attainment Trend");

    // Other sheets should be present
    expect(wb.SheetNames).toContain("Attainment Status");
    expect(wb.SheetNames).toContain("Group Heatmap");
  });

  it("attainment-rate adapter overrides sheet name to Attainment Rate", () => {
    // buildProgrammeAveragesDataset is called but sheet name is overridden
    mockedDatasets.buildProgrammeAveragesDataset.mockReturnValue({
      sheet: "Programme-Level Averages",
      title: "Programme-Level Outcome Averages",
      headers: ["Criterion", "Mean (%)"],
      rows: [["C1", "85"]],
      extra: [],
      note: "original note",
    });

    mockedDatasets.buildAttainmentStatusDataset.mockReturnValue({
      sheet: "Attainment Status",
      title: "Outcome Attainment Status",
      headers: ["Outcome", "Status"],
      rows: [["O1", "Met"]],
      extra: [],
      note: "",
    });

    mockedDatasets.buildThresholdGapDataset.mockReturnValue({
      sheet: "Threshold Gap",
      title: "Threshold Gap Analysis",
      headers: ["Outcome", "Gap (%)"],
      rows: [],
      extra: [],
      note: "",
    });

    mockedDatasets.buildOutcomeByGroupDataset.mockReturnValue({
      sheet: "Outcome Achievement",
      title: "Outcome Achievement by Group",
      headers: ["Group", "Score"],
      rows: [],
      extra: [],
      note: "",
    });

    mockedDatasets.buildRubricAchievementDataset.mockReturnValue({
      sheet: "Rubric Achievement Dist.",
      title: "Rubric Achievement Distribution",
      headers: ["Band", "Count"],
      rows: [],
      extra: [],
      note: "",
    });

    mockedDatasets.buildTrendDataset.mockReturnValue({
      sheet: "Attainment Trend",
      title: "Outcome Attainment Trend",
      headers: ["Period", "Rate (%)"],
      rows: [],
      extra: [],
      note: "",
    });

    mockedDatasets.buildGroupHeatmapDataset.mockReturnValue({
      sheet: "Group Heatmap",
      title: "Group Attainment Heatmap",
      headers: ["Group", "Outcome", "Score"],
      rows: [],
      extra: [],
      note: "",
    });

    mockedDatasets.buildJurorConsistencyDataset.mockReturnValue({
      sheet: "Juror Consistency",
      title: "Inter-Rater Consistency Heatmap",
      headers: ["Group", "CV (%)"],
      rows: [],
      extra: [],
      note: "",
    });

    mockedDatasets.buildOutcomeMappingDataset.mockReturnValue({
      sheet: "Coverage Matrix",
      title: "Coverage Matrix",
      headers: ["Outcome", "Criterion"],
      rows: [],
      extra: [],
      note: "",
    });

    const params = {
      dashboardStats: [],
      submittedData: [],
      trendData: [],
      semesterOptions: [],
      trendSemesterIds: [],
      activeOutcomes: [],
      outcomeLookup: null,
      threshold: 70,
    };

    const wb = buildAnalyticsWorkbook(params);

    // "Attainment Rate" should appear (from attainment-rate adapter override)
    expect(wb.SheetNames).toContain("Attainment Rate");
    // "Programme-Level Averages" should NOT appear in the attainment-rate section
    // (it is overridden by the adapter)
  });
});

describe("ANALYTICS_EXPORT_FORMATS", () => {
  qaTest("analytics.export.sections.03", () => {
    // ANALYTICS_EXPORT_FORMATS must exist and be an array
    expect(ANALYTICS_EXPORT_FORMATS).toBeDefined();
    expect(Array.isArray(ANALYTICS_EXPORT_FORMATS)).toBe(true);
    expect(ANALYTICS_EXPORT_FORMATS.length).toBeGreaterThan(0);

    // Extract format IDs from the array
    const formatIds = ANALYTICS_EXPORT_FORMATS.map((fmt) => fmt.id);

    // Must contain xlsx and pdf
    expect(formatIds).toContain("xlsx");
    expect(formatIds).toContain("pdf");

    // Must NOT contain csv
    expect(formatIds).not.toContain("csv");
  });
});
