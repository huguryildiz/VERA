// src/admin/analytics/analyticsExport.js
// Excel export utilities.
// Extracted from AnalyticsTab.jsx — structural refactor only.

import * as XLSX from "xlsx-js-style";
import {
  buildOutcomeByGroupDataset,
  buildProgrammeAveragesDataset,
  buildTrendDataset,
  buildCompetencyProfilesDataset,
  buildJurorConsistencyDataset,
  buildCriterionBoxplotDataset,
  buildRubricAchievementDataset,
  buildMudekMappingDataset,
} from "./analyticsDatasets";

export function addTableSheet(wb, name, title, headers, rows, extraSections = [], note = "", merges = [], alignments = []) {
  const aoa = [
    [title],
    ...(note ? [[note]] : []),
    [],
    headers,
    ...rows,
  ];
  extraSections.forEach((section) => {
    if (!section) return;
    aoa.push([], [section.title], ...(section.note ? [[section.note]] : []), section.headers, ...section.rows);
  });
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  if (merges.length) {
    const headerRowIndex = 1 + (note ? 1 : 0) + 1;
    const dataStartRow = headerRowIndex + 1;
    const sheetMerges = merges.map((m) => ({
      s: { r: dataStartRow + m.start, c: m.col },
      e: { r: dataStartRow + m.end, c: m.col },
    }));
    ws["!merges"] = [...(ws["!merges"] || []), ...sheetMerges];
    if (alignments.length) {
      alignments.forEach((a) => {
        for (let r = a.start; r <= a.end; r += 1) {
          const cellRef = XLSX.utils.encode_cell({ r: dataStartRow + r, c: a.col });
          const cell = ws[cellRef];
          if (!cell) continue;
          cell.s = cell.s || {};
          cell.s.alignment = {
            ...(cell.s.alignment || {}),
            vertical: a.valign || "center",
            horizontal: a.halign || "left",
          };
        }
      });
    }
  }
  XLSX.utils.book_append_sheet(wb, ws, name);
}

export function buildAnalyticsWorkbook({ dashboardStats, submittedData, trendData, semesterOptions, trendSemesterIds, activeOutcomes, mudekLookup }) {
  const wb = XLSX.utils.book_new();
  const datasets = [
    buildOutcomeByGroupDataset(dashboardStats, activeOutcomes),
    buildProgrammeAveragesDataset(submittedData, activeOutcomes),
    buildTrendDataset(trendData, semesterOptions, trendSemesterIds, activeOutcomes),
    buildCompetencyProfilesDataset(dashboardStats, activeOutcomes),
    buildJurorConsistencyDataset(dashboardStats, submittedData, activeOutcomes),
    buildCriterionBoxplotDataset(submittedData, activeOutcomes),
    buildRubricAchievementDataset(submittedData, activeOutcomes),
    buildMudekMappingDataset(activeOutcomes, mudekLookup),
  ];
  datasets.forEach((ds) => {
    addTableSheet(wb, ds.sheet, ds.title, ds.headers, ds.rows, ds.extra, ds.note, ds.merges, ds.alignments);
  });
  return wb;
}
