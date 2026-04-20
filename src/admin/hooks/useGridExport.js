// src/admin/useGridExport.js
// ── Export workflow for HeatmapPage ──────────────────────────

import { useCallback } from "react";
import { exportGridXLSX } from "../utils/exportXLSX";
import { downloadTable } from "../utils/downloadTable";
import { logExportInitiated } from "@/shared/api";
import { useAuth } from "@/auth";

export function useGridExport({ buildExportRows, groups, periodName, visibleJurors, lookup, activeCriteria = [], columns = null }) {
  const { activeOrganization } = useAuth();
  const tenantCode = activeOrganization?.code || "";
  const orgName = activeOrganization?.name || "";
  const deptName = "";
  const organizationId = activeOrganization?.id || null;

  // Build per-criterion rows (one tab per criterion showing that criterion's score)
  function buildCriterionTabs(jurorList) {
    return activeCriteria.map((c) => ({
      id: c.id,
      label: `${c.shortLabel || c.label || c.id} (${c.max})`,
      rows: (jurorList || []).map((juror) => {
        const scores = {};
        (groups || []).forEach((g) => {
          const entry = lookup?.[juror.key]?.[g.id];
          const val = entry?.[c.id];
          scores[g.id] = val !== null && val !== undefined ? val : null;
        });
        return { name: juror.name, dept: juror.dept ?? "", scores };
      }),
    }));
  }

  const requestExport = useCallback(async (format = "xlsx") => {
    const exportRows = buildExportRows(visibleJurors);
    const criterionTabs = buildCriterionTabs(visibleJurors);

    // Blocking pre-export audit — if this fails the export is aborted so
    // there is no "user downloaded a file but we can't prove it" window.
    await logExportInitiated({
      action: "export.heatmap",
      organizationId,
      resourceType: "score_sheets",
      details: {
        format,
        row_count: exportRows.length,
        period_name: periodName ?? null,
        project_count: groups.length,
        juror_count: exportRows.length,
        filters: {
          visible_jurors: visibleJurors.length,
          criteria_count: activeCriteria.length,
        },
      },
    });

    if (format === "xlsx") {
      void exportGridXLSX(exportRows, groups, { periodName, tenantCode, criterionTabs });
      return;
    }

    const header = columns ? columns.map(c => c.label) : ["Juror", ...groups.map((g) => g.group_no != null ? `P${g.group_no}` : (g.title || g.id)), "Avg"];
    const rows   = columns
      ? exportRows.map(r => columns.map(c => c.getValue(r)))
      : exportRows.map(r => [
          r.name,
          ...groups.map((g) => { const v = r.scores[g.id]; return v !== null && v !== undefined ? v : ""; }),
          (() => { const vals = Object.values(r.scores).filter(v => v !== null && v !== undefined); return vals.length > 0 ? (vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(1) : ""; })(),
        ]);

    await downloadTable(format, {
      filenameType: "Heatmap",
      sheetName: "Heatmap",
      periodName,
      tenantCode,
      organization: orgName,
      department: deptName,
      pdfTitle: "VERA — Heatmap",
      pdfSubtitle: `${periodName || "All Periods"} · ${exportRows.length} jurors · ${groups.length} projects`,
      header,
      rows,
      colWidths: [28, ...groups.map(() => 10), 10],
    });
  }, [buildExportRows, visibleJurors, groups, periodName, tenantCode, orgName, deptName, lookup, activeCriteria, organizationId]);

  return {
    requestExport,
  };
}
