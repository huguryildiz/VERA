// src/admin/analytics/AnalyticsTab.jsx
// Charts dashboard orchestration container.

import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx-js-style";
import { formatDashboardTs } from "../utils";
import { buildExportFilename } from "../xlsx/exportXLSX";
import { buildOutcomeLookup, getActiveCriteria } from "../../shared/criteriaHelpers";
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
import TrendPeriodSelect from "./TrendPeriodSelect";
import { DashboardSkeleton, DashboardError, DashboardEmpty } from "./AnalyticsDashboardStates";
import AnalyticsPrintReport from "./AnalyticsPrintReport";

export default function AnalyticsTab({
  dashboardStats,
  submittedData,
  overviewMetrics,
  lastRefresh,
  loading,
  error,
  periodName = "",
  semesterOptions = [],
  trendSemesterIds = [],
  onTrendSelectionChange = () => {},
  trendData = [],
  trendLoading = false,
  trendError = "",
  outcomeConfig,
  criteriaConfig,
}) {
  const { activeOrganization } = useAuth();
  const tenantCode = activeOrganization?.code || "";
  const outcomeLookup = useMemo(() => buildOutcomeLookup(outcomeConfig), [outcomeConfig]); // eslint-disable-line react-hooks/exhaustive-deps
  const activeCriteria = useMemo(() => getActiveCriteria(criteriaConfig), [criteriaConfig]); // eslint-disable-line react-hooks/exhaustive-deps

  const FALLBACK_COLORS = ["#f59e0b", "#22c55e", "#3b82f6", "#ef4444", "#a855f7", "#06b6d4"];
  const activeOutcomes = useMemo(() => {
    if (!Array.isArray(criteriaConfig) || criteriaConfig.length === 0) return [];
    return criteriaConfig.map((c, i) => ({
      key: c.key,
      label: c.shortLabel || c.label,
      max: c.max,
      rubric: c.rubric || [],
      code: Array.isArray(c.mudek) ? c.mudek.join("/") : (Array.isArray(c.mudek_outcomes) ? c.mudek_outcomes.join("/") : ""),
      mudek_outcomes: c.mudek_outcomes || [],
      color: getCriterionColor(c.key, FALLBACK_COLORS[i % FALLBACK_COLORS.length]),
    }));
  }, [criteriaConfig]);

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
    document.title = buildExportFilename("report", periodName, "pdf", tenantCode);

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
        outcomeLookup,
      });
      XLSX.writeFile(wb, buildExportFilename("analytics", periodName, "xlsx", tenantCode));
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
  const semesterLabel = periodName ? `${periodName} Period` : "Period";
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
      title: String(p.title || "").trim(),
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
        const entry = outcomeLookup?.[code];
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
  }, [activeOutcomes, outcomeLookup]);

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
      <div id="page-analytics" className="screen-charts">
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
          outcomeLookup={outcomeLookup}
          criteria={activeCriteria}
        />

        {hasSubmitted ? (
          <>
            <div className="analytics-section" id="ans-outcome-dist">
              <div className="analytics-section-title">
                <span className="section-num">01</span>Outcome Distribution
              </div>
            </div>
            <div id="chart-1" className="chart-card-v2" style={{ marginBottom: 20 }}>
              <OutcomeByGroupChart stats={dashboardStats} outcomes={activeOutcomes} />
            </div>

            <div className="analytics-section" id="ans-programme-overview">
              <div className="analytics-section-title">
                <span className="section-num">02</span>Programme Overview
              </div>
            </div>
            <div className="grid-2" style={{ marginBottom: 20 }}>
              <div id="chart-2" className="chart-card-v2">
                <OutcomeOverviewChart data={submittedData} outcomes={activeOutcomes} />
              </div>
              <div id="chart-3" className="chart-card-v2">
                <CompetencyRadarChart stats={dashboardStats} outcomes={activeOutcomes} />
              </div>
            </div>
          </>
        ) : (
          <DashboardEmpty />
        )}

        <div className="analytics-section" id="ans-trends">
          <div className="analytics-section-title">
            <span className="section-num">{hasSubmitted ? "03" : "01"}</span>Period Trend
          </div>
        </div>
        <div id="chart-trend" className="chart-card-v2" style={{ marginBottom: 20 }}>
          <OutcomeTrendChart
            data={trendData}
            periods={semesterOptions}
            selectedIds={trendSemesterIds}
            loading={trendLoading}
            error={trendError}
            headerRight={(
              <TrendPeriodSelect
                periods={semesterOptions}
                selectedIds={trendSemesterIds}
                onChange={onTrendSelectionChange}
                loading={trendLoading}
              />
            )}
            hint={trendTooMany ? "Many periods selected — scroll horizontally to compare." : ""}
            outcomes={activeOutcomes}
          />
        </div>

        {hasSubmitted && (
          <>
            <div className="analytics-section" id="ans-reliability">
              <div className="analytics-section-title">
                <span className="section-num">04</span>Juror Consistency
              </div>
            </div>
            <div id="chart-4" className="chart-card-v2" style={{ marginBottom: 20 }}>
              <JurorConsistencyHeatmap stats={dashboardStats} data={submittedData} outcomes={activeOutcomes} />
            </div>

            <div className="analytics-section" id="ans-criterion">
              <div className="analytics-section-title">
                <span className="section-num">05</span>Criterion Analytics
              </div>
            </div>
            <div className="grid-2" style={{ marginBottom: 20 }}>
              <div id="chart-5" className="chart-card-v2">
                <CriterionBoxPlotChart data={submittedData} outcomes={activeOutcomes} />
              </div>
              <div id="chart-6" className="chart-card-v2">
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
