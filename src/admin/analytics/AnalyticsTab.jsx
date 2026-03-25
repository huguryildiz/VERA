// src/admin/analytics/AnalyticsTab.jsx
// Charts dashboard orchestration container.

import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx-js-style";
import { formatDashboardTs } from "../utils";
import { buildExportFilename } from "../xlsx/exportXLSX";
import { buildMudekLookup, getActiveCriteria } from "../../shared/criteriaHelpers";
import { useAuth } from "../../shared/auth";
import { AnalyticsHeader } from "../components/analytics/AnalyticsHeader";
import {
  OutcomeByGroupChart,
  OutcomeOverviewChart,
  OutcomeTrendChart,
  CompetencyRadarChart,
  CriterionBoxPlotChart,
  JurorConsistencyHeatmap,
  RubricAchievementChart,
} from "../../charts";

import { getCriterionColor, computeOverallAvg } from "./analyticsDatasets";
import { buildAnalyticsWorkbook } from "./analyticsExport";
import TrendSemesterSelect from "./TrendSemesterSelect";
import { DashboardSkeleton, DashboardError, DashboardEmpty } from "./AnalyticsDashboardStates";
import AnalyticsPrintReport from "./AnalyticsPrintReport";

export default function AnalyticsTab({
  dashboardStats,
  submittedData,
  overviewMetrics,
  lastRefresh,
  loading,
  error,
  semesterName = "",
  semesterOptions = [],
  trendSemesterIds = [],
  onTrendSelectionChange = () => {},
  trendData = [],
  trendLoading = false,
  trendError = "",
  mudekTemplate,
  criteriaTemplate,
}) {
  const { activeTenant } = useAuth();
  const tenantCode = activeTenant?.code || "";
  const mudekLookup = useMemo(() => buildMudekLookup(mudekTemplate), [mudekTemplate]); // eslint-disable-line react-hooks/exhaustive-deps
  const activeCriteria = useMemo(() => getActiveCriteria(criteriaTemplate), [criteriaTemplate]); // eslint-disable-line react-hooks/exhaustive-deps

  const FALLBACK_COLORS = ["#f59e0b", "#22c55e", "#3b82f6", "#ef4444", "#a855f7", "#06b6d4"];
  const activeOutcomes = useMemo(() => {
    if (!Array.isArray(criteriaTemplate) || criteriaTemplate.length === 0) return [];
    return criteriaTemplate.map((c, i) => ({
      key: c.key,
      label: c.shortLabel || c.label,
      max: c.max,
      rubric: c.rubric || [],
      code: Array.isArray(c.mudek) ? c.mudek.join("/") : (Array.isArray(c.mudek_outcomes) ? c.mudek_outcomes.join("/") : ""),
      mudek_outcomes: c.mudek_outcomes || [],
      color: getCriterionColor(c.key, FALLBACK_COLORS[i % FALLBACK_COLORS.length]),
    }));
  }, [criteriaTemplate]);

  const activeTrendLegend = useMemo(() =>
    activeOutcomes.map((o) => ({
      key: o.key,
      label: o.label,
      code: o.code,
      color: o.color || getCriterionColor(o.key, "#94a3b8"),
    }))
  , [activeOutcomes]);
  const restoreRef   = useRef(null);
  const [exporting, setExporting] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);

  // PDF export — .print-report is always in the DOM (display:none on screen).
  async function handleExportPdf() {
    if (exporting) return;
    setExporting(true);

    let done = false;
    const originalTitle = document.title;
    document.title = buildExportFilename("report", semesterName, "pdf", tenantCode);

    const restore = () => {
      if (done) return;
      done = true;
      document.title = originalTitle;
      clearTimeout(safariTimer);
      window.removeEventListener("afterprint", restore);
      printMq.removeEventListener("change", onMqChange);
      restoreRef.current = null;
      setExporting(false);
    };
    restoreRef.current = restore;

    window.addEventListener("afterprint", restore, { once: true });
    const printMq = window.matchMedia("print");
    const onMqChange = (e) => { if (!e.matches) restore(); };
    printMq.addEventListener("change", onMqChange);
    const safariTimer = setTimeout(restore, 60_000);
    await document.fonts.ready;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

    window.print();
  }

  useEffect(() => () => { restoreRef.current?.(); }, []);
  useEffect(() => {
    const handleBeforePrint = () => {
      window.dispatchEvent(new Event("resize"));
    };
    const mq = window.matchMedia?.("print");
    const onMqChange = (e) => {
      if (e.matches) window.dispatchEvent(new Event("resize"));
    };
    window.addEventListener("beforeprint", handleBeforePrint);
    if (mq?.addEventListener) mq.addEventListener("change", onMqChange);
    else if (mq?.addListener) mq.addListener(onMqChange);
    return () => {
      window.removeEventListener("beforeprint", handleBeforePrint);
      if (mq?.removeEventListener) mq.removeEventListener("change", onMqChange);
      else if (mq?.removeListener) mq.removeListener(onMqChange);
    };
  }, []);

  function exportExcelAll() {
    if (exportingExcel) return;
    setExportingExcel(true);
    try {
      const wb = buildAnalyticsWorkbook({
        dashboardStats,
        submittedData,
        trendData,
        semesterOptions,
        trendSemesterIds,
        activeOutcomes,
        mudekLookup,
      });
      XLSX.writeFile(wb, buildExportFilename("analytics", semesterName, "xlsx", tenantCode));
    } finally {
      setExportingExcel(false);
    }
  }

  const showPrint = formatDashboardTs(lastRefresh);
  const lastRefreshDate = (() => {
    if (!lastRefresh) return "—";
    const dt = new Date(lastRefresh);
    if (Number.isNaN(dt.getTime())) return "—";
    return dt
      .toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" })
      .replace(/\//g, ".");
  })();
  const lastRefreshTime = (() => {
    if (!lastRefresh) return "—";
    const dt = new Date(lastRefresh);
    if (Number.isNaN(dt.getTime())) return "—";
    return dt.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", hour12: false });
  })();
  const lastRefreshValue =
    lastRefreshDate !== "—" && lastRefreshTime !== "—"
      ? (
        <span className="kpi-date-stack">
          <span className="kpi-date">{lastRefreshDate}</span>
          <span className="kpi-time">{lastRefreshTime}</span>
        </span>
      )
      : "—";
  const printDate = (() => {
    const dt = lastRefresh ? new Date(lastRefresh) : new Date();
    if (Number.isNaN(dt.getTime())) return showPrint;
    const datePart = dt.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    const timePart = dt.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    return `${datePart} · ${timePart}`;
  })();
  const semesterLabel = semesterName ? `${semesterName} Semester` : "Semester";
  const totalJurors = overviewMetrics?.totalJurors ?? 0;
  const completedJurors = overviewMetrics?.completedJurors ?? 0;
  const totalGroups = dashboardStats?.length ?? 0;
  const scoredEvaluations = overviewMetrics?.scoredEvaluations ?? (submittedData?.length ?? 0);
  const totalEvaluations =
    overviewMetrics?.totalEvaluations ?? totalJurors * totalGroups;
  const completedPct = totalJurors > 0 ? Math.round((completedJurors / totalJurors) * 100) : 0;
  const scoredPct = totalEvaluations > 0 ? Math.round((scoredEvaluations / totalEvaluations) * 100) : 0;
  const jurorLabel = `${totalJurors} Juror${totalJurors === 1 ? "" : "s"}`;
  const groupLabel = `${totalGroups} Group${totalGroups === 1 ? "" : "s"}`;
  const completedLabel = `${completedJurors}/${totalJurors} (${completedPct}%) Completed Juror${totalJurors === 1 ? "" : "s"}`;
  const scoredLabel = `${scoredEvaluations}/${totalEvaluations} (${scoredPct}%) Scored Evaluation${totalEvaluations === 1 ? "" : "s"}`;
  const summaryLabel = `${jurorLabel} · ${groupLabel} · ${completedLabel} · ${scoredLabel}`;

  const overallAvg = computeOverallAvg(submittedData, activeOutcomes);
  const hasSubmitted = (submittedData || []).length > 0;
  const trendSelectedCount = (trendSemesterIds || []).length;
  const trendTooMany = trendSelectedCount > 8;
  const appendixRows = useMemo(() => {
    const normalizeStudents = (value) => {
      if (Array.isArray(value)) {
        return value.map((s) => String(s || "").trim()).filter(Boolean);
      }
      return String(value || "")
        .split(/[;,]/)
        .map((s) => s.trim())
        .filter(Boolean);
    };
    const rows = (dashboardStats || []).map((p) => ({
      groupNo: Number.isFinite(p.groupNo) ? p.groupNo : null,
      groupLabel: p.name || (Number.isFinite(p.groupNo) ? `Group ${p.groupNo}` : "Group —"),
      projectTitle: String(p.projectTitle || "").trim(),
      students: normalizeStudents(p.students),
    }));
    return rows.sort((a, b) => {
      if (a.groupNo == null && b.groupNo == null) return 0;
      if (a.groupNo == null) return 1;
      if (b.groupNo == null) return -1;
      return a.groupNo - b.groupNo;
    });
  }, [dashboardStats]);

  const mudekMappingRows = useMemo(() => {
    const rows = [];
    activeOutcomes.forEach((o) => {
      const ids = Array.isArray(o.mudek_outcomes) ? o.mudek_outcomes : [];
      const codes = ids.length > 0 ? ids : (o.code ? String(o.code).split("/").map((c) => c.trim()).filter(Boolean) : []);
      const label = o.label;
      const count = Math.max(1, codes.length);
      if (!codes.length) {
        rows.push({ criteria: label, code: "—", text: "—", rowSpan: 1, showCriteria: true });
        return;
      }
      codes.forEach((code, idx) => {
        let text = "—";
        const entry = mudekLookup?.[code];
        if (entry) {
          text = entry.desc_en || entry.desc_tr || "—";
        }
        const displayCode = entry?.code || code;
        rows.push({
          criteria: label,
          code: displayCode,
          text,
          rowSpan: idx === 0 ? count : 0,
          showCriteria: idx === 0,
        });
      });
    });
    return rows;
  }, [activeOutcomes, mudekLookup]);

  if (loading) {
    return (
      <div className="dashboard-print-wrap">
        <DashboardSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-print-wrap">
        <DashboardError message={error} />
      </div>
    );
  }

  if (!hasSubmitted && trendSelectedCount === 0 && !trendLoading && !trendError) {
    return (
      <div className="dashboard-print-wrap">
        <DashboardEmpty />
      </div>
    );
  }

  return (
    <div className="dashboard-print-wrap">
      {/* Screen charts — hidden in print */}
      <div className="screen-charts">
        <AnalyticsHeader
          completedJurors={completedJurors}
          totalJurors={totalJurors}
          completedPct={completedPct}
          scoredEvaluations={scoredEvaluations}
          totalEvaluations={totalEvaluations}
          scoredPct={scoredPct}
          overallAvg={overallAvg}
          lastRefreshValue={lastRefreshValue}
          exporting={exporting}
          exportingExcel={exportingExcel}
          onExportPdf={handleExportPdf}
          onExportExcel={exportExcelAll}
          mudekLookup={mudekLookup}
          criteria={activeCriteria}
        />

        {hasSubmitted ? (
          <>
            <div className="dashboard-section-label" lang="en">Outcome Distribution</div>
            <div className="dashboard-grid dashboard-row" data-row="1">
              <div className="chart-span-2 chart-card dashboard-card" id="chart-1">
                <OutcomeByGroupChart stats={dashboardStats} outcomes={activeOutcomes} />
              </div>
            </div>

            <div className="dashboard-section-label" lang="en">Programme Overview</div>
            <div className="dashboard-grid dashboard-row" data-row="2">
              <div className="chart-card dashboard-card" id="chart-2">
                <OutcomeOverviewChart data={submittedData} outcomes={activeOutcomes} />
              </div>
              <div className="chart-card dashboard-card" id="chart-3">
                <CompetencyRadarChart stats={dashboardStats} outcomes={activeOutcomes} />
              </div>
            </div>
          </>
        ) : (
          <DashboardEmpty />
        )}

        <div className="dashboard-section-label" lang="en">Semester Trend</div>
        <div className="dashboard-grid dashboard-row" data-row="2b">
          <div className="chart-span-2 chart-card dashboard-card" id="chart-trend">
            <OutcomeTrendChart
              data={trendData}
              semesters={semesterOptions}
              selectedIds={trendSemesterIds}
              loading={trendLoading}
              error={trendError}
              headerRight={(
                <TrendSemesterSelect
                  semesters={semesterOptions}
                  selectedIds={trendSemesterIds}
                  onChange={onTrendSelectionChange}
                  loading={trendLoading}
                />
              )}
              hint={trendTooMany ? "Many semesters selected — scroll horizontally to compare." : ""}
              outcomes={activeOutcomes}
            />
          </div>
        </div>

        {hasSubmitted && (
          <>
            <div className="dashboard-section-label" lang="en">Juror Consistency</div>
            <div className="dashboard-grid dashboard-row" data-row="3">
              <div className="chart-span-2 chart-card dashboard-card" id="chart-4">
                <JurorConsistencyHeatmap stats={dashboardStats} data={submittedData} outcomes={activeOutcomes} />
              </div>
            </div>

            <div className="dashboard-section-label" lang="en">Criterion Analytics</div>
            <div className="dashboard-grid dashboard-row" data-row="4">
              <div className="chart-card dashboard-card" id="chart-5">
                <CriterionBoxPlotChart data={submittedData} outcomes={activeOutcomes} />
              </div>
              <div className="chart-card dashboard-card" id="chart-6">
                <RubricAchievementChart data={submittedData} outcomes={activeOutcomes} />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Print report — display:none on screen, one chart per A4 page */}
      <AnalyticsPrintReport
        dashboardStats={dashboardStats}
        submittedData={submittedData}
        activeOutcomes={activeOutcomes}
        activeTrendLegend={activeTrendLegend}
        trendData={trendData}
        semesterOptions={semesterOptions}
        trendSemesterIds={trendSemesterIds}
        semesterLabel={semesterLabel}
        printDate={printDate}
        summaryLabel={summaryLabel}
        mudekMappingRows={mudekMappingRows}
        appendixRows={appendixRows}
      />
    </div>
  );
}
