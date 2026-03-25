// src/admin/useGridExport.js
// ── Export workflow for ScoreGrid ────────────────────────────

import { useCallback } from "react";
import { exportGridXLSX } from "./xlsx/exportXLSX";
import { useAuth } from "../shared/auth";

export function useGridExport({ buildExportRows, groups, semesterName, visibleJurors }) {
  const { activeTenant } = useAuth();
  const tenantCode = activeTenant?.code || "";
  const doExport = useCallback((jurorList) => {
    const exportRows = buildExportRows(jurorList);
    void exportGridXLSX(exportRows, groups, { semesterName, tenantCode });
  }, [buildExportRows, groups, semesterName, tenantCode]);

  const requestExport = useCallback(() => {
    doExport(visibleJurors);
  }, [visibleJurors, doExport]);

  return {
    requestExport,
  };
}
