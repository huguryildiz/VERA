// src/admin/components/analytics/AnalyticsHeader.jsx
// Analytics dashboard header: KPI strip + MÜDEK badge + export toolbar.

import { DownloadIcon, LoaderIcon } from "../../../shared/Icons";
import { MudekBadge } from "../../../charts";

export function AnalyticsHeader({
  completedJurors,
  totalJurors,
  completedPct,
  scoredEvaluations,
  totalEvaluations,
  scoredPct,
  overallAvg,
  lastRefreshValue,
  exporting,
  exportingExcel,
  onExportPdf,
  onExportExcel,
  mudekLookup,
  criteria,
}) {
  return (
    <>
      {/* KPI summary strip */}
      <div className="scores-kpi-strip" style={{ marginBottom: 12 }}>
        <div className="scores-kpi-item">
          <div className="scores-kpi-item-value">{completedJurors}/{totalJurors}</div>
          <div className="scores-kpi-item-label">Jurors · {completedPct}% done</div>
        </div>
        <div className="scores-kpi-item">
          <div className="scores-kpi-item-value">{scoredEvaluations}/{totalEvaluations}</div>
          <div className="scores-kpi-item-label">Evaluations · {scoredPct}% scored</div>
        </div>
        <div className="scores-kpi-item">
          <div className="scores-kpi-item-value">
            {overallAvg !== null ? <span className="accent">{overallAvg}%</span> : "—"}
          </div>
          <div className="scores-kpi-item-label">Overall Avg</div>
        </div>
        <div className="scores-kpi-item">
          <div className="scores-kpi-item-value" style={{ fontSize: 13, fontFamily: "inherit" }}>
            {lastRefreshValue}
          </div>
          <div className="scores-kpi-item-label">Last Refresh</div>
        </div>
      </div>

      {/* MÜDEK badge + export actions */}
      <div className="analytics-header" style={{ marginBottom: 20 }}>
        <div className="analytics-header-left">
          <MudekBadge mudekLookup={mudekLookup} criteria={criteria} />
        </div>
        <div className="analytics-actions">
          <button
            className="btn btn-outline btn-sm"
            onClick={onExportPdf}
            disabled={exporting}
            aria-label={exporting ? "Preparing PDF export" : "Export PDF"}
            title={exporting ? "Preparing PDF…" : 'Export PDF — uncheck "Headers and footers" in the print dialog'}
          >
            {exporting
              ? <span className="spin-icon" aria-hidden="true"><LoaderIcon /></span>
              : <DownloadIcon />}
            {exporting ? "Exporting…" : "PDF"}
          </button>
          <button
            className="btn btn-outline btn-sm"
            onClick={onExportExcel}
            disabled={exportingExcel}
            aria-label={exportingExcel ? "Preparing Excel export" : "Export Excel"}
            title={exportingExcel ? "Preparing Excel…" : "Export Excel"}
          >
            {exportingExcel
              ? <span className="spin-icon" aria-hidden="true"><LoaderIcon /></span>
              : <DownloadIcon />}
            {exportingExcel ? "Exporting…" : "Excel"}
          </button>
        </div>
      </div>
    </>
  );
}
