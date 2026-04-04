// src/admin/AnalyticsPage.jsx
// Full Analytics page — Programme Outcome Analytics.
// Wired to props from ScoresTab (data flows from useAdminData).

import { useState, useRef, useEffect } from "react";
import { outcomeValues } from "@/shared/stats";
import { useToast } from "@/shared/hooks/useToast";
import { buildExportFilename } from "../utils/exportXLSX";
import { OutcomeByGroupChart } from "@/charts/OutcomeByGroupChart";
import { RubricAchievementChart } from "@/charts/RubricAchievementChart";
import { ProgrammeAveragesChart } from "@/charts/ProgrammeAveragesChart";
import { AttainmentTrendChart } from "@/charts/AttainmentTrendChart";
import { AttainmentRateChart } from "@/charts/AttainmentRateChart";
import { ThresholdGapChart } from "@/charts/ThresholdGapChart";
import { GroupAttainmentHeatmap } from "@/charts/GroupAttainmentHeatmap";
import { JurorConsistencyHeatmap } from "@/charts/JurorConsistencyHeatmap";
import { CoverageMatrix } from "@/charts/CoverageMatrix";
import "../../styles/pages/analytics.css";

const ATTAINMENT_THRESHOLD = 70;

// ── Insight icon ──────────────────────────────────────────────
function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}

// ── Download icon ─────────────────────────────────────────────
function DownloadIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

// ── Attainment card computation ────────────────────────────────
// Returns one card per unique MÜDEK outcome code across all criteria.
function buildAttainmentCards(submittedData, criteria = []) {
  const rows = submittedData || [];
  // Collect all directly-mapped outcome codes and their source criteria
  const outcomeMap = new Map(); // outcomeCode → { label, criterionId, max }
  for (const c of criteria) {
    for (const code of (c.mudek || [])) {
      if (!outcomeMap.has(code)) {
        outcomeMap.set(code, { criterionId: c.id, max: c.max });
      }
    }
  }

  const OUTCOME_LABELS = {
    "1.2": "Knowledge Application",
    "2":   "Problem Analysis",
    "3.1": "Creative Solutions",
    "3.2": "Realistic Design",
    "8.1": "Intra-disciplinary Teams",
    "8.2": "Multi-disciplinary Teams",
    "9.1": "Oral Communication",
    "9.2": "Written Communication",
  };

  const cards = [];
  for (const [code, { criterionId, max }] of outcomeMap) {
    const vals = outcomeValues(rows, criterionId);
    let attRate = null;
    if (vals.length) {
      const above = vals.filter((v) => (v / max) * 100 >= ATTAINMENT_THRESHOLD).length;
      attRate = Math.round((above / vals.length) * 100);
    }

    const statusClass =
      attRate == null ? "status-no-data" :
      attRate >= ATTAINMENT_THRESHOLD ? "status-met" :
      attRate >= 60 ? "status-borderline" :
      "status-not-met";

    const statusLabel =
      attRate == null ? "No data" :
      attRate >= ATTAINMENT_THRESHOLD ? "Met" :
      attRate >= 60 ? "Borderline" :
      "Not Met";

    const statusPrefix =
      attRate == null ? "" :
      attRate >= ATTAINMENT_THRESHOLD ? "✓ " :
      attRate >= 60 ? "∼ " :
      "✗ ";

    cards.push({
      code,
      label: OUTCOME_LABELS[code] ?? code,
      attRate,
      statusClass,
      statusLabel,
      statusPrefix,
    });
  }

  // Sort: met first, then borderline, then not-met, then no-data; within group by attRate desc
  const ORDER = { "status-met": 0, "status-borderline": 1, "status-not-met": 2, "status-no-data": 3 };
  cards.sort((a, b) => {
    const od = ORDER[a.statusClass] - ORDER[b.statusClass];
    if (od !== 0) return od;
    return (b.attRate ?? -1) - (a.attRate ?? -1);
  });

  return cards;
}

// ── MÜDEK Popover ─────────────────────────────────────────────
function MudekBadge({ criteria = [] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Collect all directly-mapped outcomes from criteria
  const mappedOutcomes = [];
  const seen = new Set();
  for (const c of criteria) {
    for (const code of (c.mudek || [])) {
      if (!seen.has(code)) {
        seen.add(code);
        mappedOutcomes.push(code);
      }
    }
  }

  const OUTCOME_LABELS = {
    "1.2": "Knowledge application to complex problems",
    "2":   "Problem identification & analysis",
    "3.1": "Creative engineering solutions",
    "3.2": "Design under realistic constraints",
    "8.1": "Intra-disciplinary teamwork",
    "8.2": "Multi-disciplinary teamwork",
    "9.1": "Oral communication",
    "9.2": "Written communication",
  };

  return (
    <div className="mudek-badge" ref={ref} onClick={() => setOpen((v) => !v)} role="button" aria-expanded={open}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
        <path d="M6 12v5c0 1.657 2.686 3 6 3s6-1.343 6-3v-5" />
      </svg>
      MÜDEK 2024 · {mappedOutcomes.length} outcomes mapped
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
        <path d="m6 9 6 6 6-6" />
      </svg>
      {open && (
        <div className="mudek-popover" onClick={(e) => e.stopPropagation()}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: "var(--text-primary)" }}>Active Framework: MÜDEK 2024</div>
          <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 10 }}>
            This dashboard provides direct assessment evidence for the following programme outcomes from the active accreditation framework:
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11 }}>
            {mappedOutcomes.map((code) => (
              <div key={code} style={{ display: "flex", gap: 8 }}>
                <span style={{ fontFamily: "var(--mono)", fontWeight: 700, color: "var(--accent)", minWidth: 28 }}>{code}</span>
                <span style={{ color: "var(--text-secondary)" }}>{OUTCOME_LABELS[code] ?? code}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid var(--border)", fontSize: 10, color: "var(--text-tertiary)" }}>
            Attainment target: ≥70% of evaluations must meet the scoring threshold
          </div>
        </div>
      )}
    </div>
  );
}

// ── Analytics Nav ─────────────────────────────────────────────
function AnalyticsNav({ activeSection }) {
  const items = [
    { id: "ans-attainment", label: "Attainment Status" },
    { id: "ans-analysis",   label: "Analysis" },
    { id: "ans-overview",   label: "Programme Overview" },
    { id: "ans-trends",     label: "Trends" },
    { id: "ans-reliability",label: "Reliability" },
    { id: "ans-coverage",   label: "Coverage" },
  ];

  function scrollTo(id) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <nav className="analytics-nav" aria-label="Analytics sections">
      {items.map(({ id, label }) => (
        <button
          key={id}
          className={`analytics-nav-item${activeSection === id ? " active" : ""}`}
          onClick={() => scrollTo(id)}
          type="button"
        >
          {label}
        </button>
      ))}
    </nav>
  );
}

// ── Export Panel ──────────────────────────────────────────────
function ExportPanel({ onClose, onExport }) {
  return (
    <div className="export-panel" role="region" aria-label="Export analytics">
      <div className="export-panel-header">
        <div>
          <h4><DownloadIcon /> Export Analytics</h4>
          <div className="export-panel-sub">Download outcome attainment data, charts, and trend analysis.</div>
        </div>
        <button className="export-panel-close" onClick={onClose} aria-label="Close export panel">&#215;</button>
      </div>
      <div className="export-options">
        <div className="export-option selected">
          <span className="export-option-selected-pill">Selected</span>
          <div className="export-option-icon export-option-icon--xlsx"><span className="file-icon"><span className="file-icon-label">XLS</span></span></div>
          <div className="export-option-title">Excel (.xlsx)</div>
          <div className="export-option-desc">Outcome cards, charts, and summary tables</div>
          <div className="export-option-hint">Best for sharing</div>
        </div>
        <div className="export-option">
          <span className="export-option-selected-pill">Selected</span>
          <div className="export-option-icon export-option-icon--csv"><span className="file-icon"><span className="file-icon-label">CSV</span></span></div>
          <div className="export-option-title">CSV (.csv)</div>
          <div className="export-option-desc">Raw analytics datapoints for external analysis</div>
          <div className="export-option-hint">Best for analysis</div>
        </div>
        <div className="export-option">
          <span className="export-option-selected-pill">Selected</span>
          <div className="export-option-icon export-option-icon--pdf"><span className="file-icon"><span className="file-icon-label">PDF</span></span></div>
          <div className="export-option-title">PDF Report</div>
          <div className="export-option-desc">Formatted outcome attainment report</div>
          <div className="export-option-hint">Best for archival</div>
        </div>
      </div>
      <div className="export-footer">
        <div className="export-footer-info">
          <div className="export-footer-format">Excel (.xlsx) · Analytics</div>
          <div className="export-footer-meta">Outcome attainment data</div>
        </div>
        <button className="btn btn-primary btn-sm export-download-btn" onClick={onExport} type="button">
          <DownloadIcon /> Download Excel
        </button>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────
export default function AnalyticsPage({
  dashboardStats = [],
  submittedData = [],
  overviewMetrics,
  lastRefresh,
  loading,
  error,
  periodName,
  semesterOptions,
  trendSemesterIds,
  onTrendSelectionChange,
  trendData,
  trendLoading,
  trendError,
  criteriaConfig,
  outcomeConfig,
}) {
  const criteria = criteriaConfig || [];
  const [exportOpen, setExportOpen] = useState(false);
  const _toast = useToast();

  async function handleExport() {
    try {
      const { buildAnalyticsWorkbook } = await import("../analytics/analyticsExport");
      const XLSX = await import("xlsx-js-style");
      const wb = buildAnalyticsWorkbook({
        dashboardStats,
        submittedData,
        trendData: trendData || [],
        semesterOptions: semesterOptions || [],
        trendSemesterIds: trendSemesterIds || [],
        activeOutcomes: criteria,
        mudekLookup: outcomeConfig || [],
      });
      XLSX.writeFile(wb, buildExportFilename("analytics", periodName || "all", "xlsx"));
      _toast.success("Analytics exported");
    } catch (e) {
      _toast.error(e?.message || "Export failed");
    }
  }

  const attCards = buildAttainmentCards(submittedData, criteria);
  const metCount = attCards.filter((c) => c.statusClass === "status-met").length;
  const totalCount = attCards.filter((c) => c.attRate != null).length;

  if (loading) {
    return (
      <div className="analytics-loading">
        Loading analytics…
      </div>
    );
  }

  if (error) {
    return (
      <div className="analytics-error">
        {error}
      </div>
    );
  }

  return (
    <div className="analytics-page">
      {/* ── Header ── */}
      <div className="analytics-header">
        <div className="analytics-header-left">
          <div className="page-title">Programme Outcome Analytics</div>
          <div className="page-desc">
            Outcome attainment &amp; continuous improvement evidence
            {periodName ? ` — ${periodName}` : ""}
          </div>
        </div>
        <div className="analytics-actions">
          <MudekBadge criteria={criteria} />
          <button
            className="btn btn-outline btn-sm"
            onClick={() => setExportOpen((v) => !v)}
            type="button"
          >
            <DownloadIcon /> Export
          </button>
        </div>
      </div>

      {/* ── Export Panel ── */}
      {exportOpen && <ExportPanel onClose={() => setExportOpen(false)} onExport={handleExport} />}

      {/* ── Analytics Nav ── */}
      <AnalyticsNav />

      {/* ══════ SECTION 01: Outcome Attainment Status ══════ */}
      <div className="analytics-section" id="ans-attainment">
        <div className="analytics-section-title">
          <span className="section-num">01</span>Outcome Attainment Status
        </div>
      </div>

      {attCards.length > 0 ? (
        <>
          <div className="attainment-cards">
            {attCards.map(({ code, label, attRate, statusClass, statusLabel, statusPrefix }) => (
              <div key={code} className={`att-card ${statusClass}`}>
                <div className="att-card-header">
                  <span className="att-card-code">PO {code}</span>
                  <span className={`att-card-status ${statusClass.replace("status-", "")}`}>
                    {statusPrefix}{statusLabel}
                  </span>
                </div>
                <div className="att-card-label">{label}</div>
                <div className="att-card-metric">
                  <span className={`att-card-value ${statusClass.replace("status-", "")}`}>
                    {attRate != null ? `${attRate}%` : "—"}
                  </span>
                  <span className="att-card-unit">above threshold</span>
                </div>
                {attRate != null && (
                  <div className="att-card-bar">
                    <div
                      className="att-card-bar-fill"
                      style={{
                        width: `${attRate}%`,
                        background: attRate >= 70
                          ? "var(--status-met-text)"
                          : attRate >= 60
                          ? "var(--status-borderline-text)"
                          : "var(--status-not-met-text)",
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
          {totalCount > 0 && (
            <div className="insight-banner insight-banner-full">
              <InfoIcon />
              <div>
                <strong>{metCount} of {totalCount}</strong> outcomes met —
                {metCount < totalCount
                  ? " outcomes below target require curriculum-level action items per the accreditation framework's periodic monitoring requirements."
                  : " all mapped outcomes meet the 70% attainment threshold."}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="analytics-empty">No score data available for attainment analysis.</div>
      )}

      {/* ══════ SECTION 02: Attainment Analysis ══════ */}
      <div className="analytics-section" id="ans-analysis">
        <div className="analytics-section-title">
          <span className="section-num">02</span>Attainment Analysis
        </div>
      </div>

      <div className="analytics-chart-pair" style={{ marginBottom: 18 }}>
        <div className="chart-card-v2">
          <div className="chart-header">
            <div>
              <div className="chart-title">Outcome Attainment Rate</div>
              <div className="chart-subtitle">% of evaluations scoring ≥70% per programme outcome</div>
            </div>
          </div>
          <div className="chart-body">
            <AttainmentRateChart submittedData={submittedData} criteria={criteria} />
          </div>
          <div className="chart-legend">
            <div className="legend-item"><div className="legend-dot" style={{ background: "var(--success)" }} />Met (≥70%)</div>
            <div className="legend-item"><div className="legend-dot" style={{ background: "var(--warning)" }} />Borderline (60–69%)</div>
            <div className="legend-item"><div className="legend-dot" style={{ background: "var(--danger)" }} />Not met (&lt;60%)</div>
            <div className="legend-item">
              <div className="legend-line" style={{ background: "var(--text-tertiary)", borderTop: "2px dashed var(--text-tertiary)", height: 0, width: 16 }} />
              Target (70%)
            </div>
          </div>
        </div>

        <div className="chart-card-v2">
          <div className="chart-header">
            <div>
              <div className="chart-title">Threshold Gap Analysis</div>
              <div className="chart-subtitle">Deviation from 70% competency threshold per outcome</div>
            </div>
          </div>
          <div className="chart-body">
            <ThresholdGapChart submittedData={submittedData} criteria={criteria} />
          </div>
          <div className="chart-legend">
            <div className="legend-item"><div className="legend-dot" style={{ background: "var(--success)" }} />Above threshold</div>
            <div className="legend-item"><div className="legend-dot" style={{ background: "var(--danger)" }} />Below threshold</div>
          </div>
        </div>
      </div>

      <div className="insight-banner insight-banner-full">
        <InfoIcon />
        <div>
          Attainment rate shows <em>what % meet threshold</em>; gap analysis shows <em>how far</em> each deviates — outcomes near zero need monitoring even if above the line.
        </div>
      </div>

      {/* ══════ SECTION 03: Outcome Achievement by Group ══════ */}
      <div className="analytics-section">
        <div className="analytics-section-title">
          <span className="section-num">03</span>Outcome Achievement by Group
        </div>
      </div>

      <div className="chart-card-v2" style={{ marginBottom: 18 }}>
        <div className="chart-header">
          <div>
            <div className="chart-title">Outcome Achievement by Group</div>
            <div className="chart-subtitle">Normalized score (0–100%) per criterion per project group — 70% threshold reference</div>
          </div>
        </div>
        <div className="chart-body">
          <OutcomeByGroupChart dashboardStats={dashboardStats} criteria={criteria} />
        </div>
        <div className="chart-legend">
          {criteria.map((c) => (
            <div key={c.id} className="legend-item">
              <div className="legend-dot" style={{ background: c.color }} />
              {c.shortLabel} ({(c.mudek || []).join("/")})
            </div>
          ))}
          <div className="legend-item">
            <div className="legend-line" style={{ background: "var(--text-tertiary)", borderTop: "2px dashed var(--text-tertiary)", height: 0, width: 16 }} />
            70% threshold
          </div>
        </div>
      </div>

      <div className="insight-banner insight-banner-full">
        <InfoIcon />
        <div>
          Per-group normalized scores provide <strong>direct assessment evidence</strong> for accreditation. Groups below threshold trigger continuous improvement actions.
        </div>
      </div>

      {/* ══════ SECTION 04: Programme Overview ══════ */}
      <div className="analytics-section" id="ans-overview">
        <div className="analytics-section-title">
          <span className="section-num">04</span>Programme Overview
        </div>
      </div>

      <div className="analytics-chart-pair" style={{ marginBottom: 18 }}>
        <div className="chart-card-v2">
          <div className="chart-header">
            <div>
              <div className="chart-title">Rubric Achievement Distribution</div>
              <div className="chart-subtitle">Performance band breakdown per criterion — continuous improvement evidence</div>
            </div>
          </div>
          <div className="chart-body">
            <RubricAchievementChart submittedData={submittedData} criteria={criteria} />
          </div>
          <div className="chart-legend">
            <div className="legend-item"><div className="legend-dot" style={{ background: "#22c55e" }} />Excellent</div>
            <div className="legend-item"><div className="legend-dot" style={{ background: "#a3e635" }} />Good</div>
            <div className="legend-item"><div className="legend-dot" style={{ background: "#f59e0b" }} />Developing</div>
            <div className="legend-item"><div className="legend-dot" style={{ background: "#ef4444" }} />Insufficient</div>
          </div>
        </div>

        <div className="chart-card-v2">
          <div className="chart-header">
            <div>
              <div className="chart-title">Programme-Level Outcome Averages</div>
              <div className="chart-subtitle">Grand mean (%) ± 1σ per criterion with 70% threshold reference</div>
            </div>
          </div>
          <div className="chart-body">
            <ProgrammeAveragesChart submittedData={submittedData} criteria={criteria} />
          </div>
          <div className="chart-legend">
            {criteria.map((c) => (
              <div key={c.id} className="legend-item">
                <div className="legend-dot" style={{ background: c.color }} />
                {c.shortLabel} ({(c.mudek || []).join("/")})
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="insight-banner insight-banner-full">
        <InfoIcon />
        <div>
          Rubric bands provide <strong>continuous improvement evidence</strong>; programme averages with ±1σ highlight criteria with high <strong>assessment variability</strong>.
        </div>
      </div>

      {/* ══════ SECTION 05: Continuous Improvement (Trends) ══════ */}
      <div className="analytics-section" id="ans-trends">
        <div className="analytics-section-title">
          <span className="section-num">05</span>Continuous Improvement
        </div>
      </div>

      <div className="chart-card-v2" style={{ marginBottom: 12 }}>
        <div className="chart-header">
          <div>
            <div className="chart-title">Attainment Rate Trend</div>
            <div className="chart-subtitle">
              % of evaluations meeting 70% threshold across evaluation periods with matching criteria templates
            </div>
          </div>
          {semesterOptions && semesterOptions.length > 0 && (
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Periods:</span>
              {semesterOptions.map((s) => {
                const selected = trendSemesterIds?.includes(s.id);
                return (
                  <button
                    key={s.id}
                    className={`badge ${selected ? "badge-success" : "badge-neutral"}`}
                    style={{ fontSize: 10, cursor: "pointer", border: "none", background: "none" }}
                    onClick={() => {
                      if (!onTrendSelectionChange) return;
                      const next = selected
                        ? (trendSemesterIds || []).filter((id) => id !== s.id)
                        : [...(trendSemesterIds || []), s.id];
                      onTrendSelectionChange(next);
                    }}
                    type="button"
                  >
                    {s.name || s.semester_name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="chart-body">
          {trendLoading ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, color: "var(--text-muted)" }}>
                Loading trend data…
              </div>
            ) : trendError ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, color: "var(--danger)" }}>
                {trendError}
              </div>
            ) : (
              <AttainmentTrendChart
                trendData={trendData}
                semesterOptions={semesterOptions}
                selectedIds={trendSemesterIds}
                criteria={criteria}
              />
            )}
        </div>
        <div className="chart-legend">
          {criteria.map((c) => (
            <div key={c.id} className="legend-item">
              <div className="legend-dot" style={{ background: c.color }} />
              {c.shortLabel} ({(c.mudek || []).join("/")})
            </div>
          ))}
          <div className="legend-item">
            <div className="legend-line" style={{ background: "var(--text-tertiary)", borderTop: "2px dashed var(--text-tertiary)", height: 0, width: 16 }} />
            Attainment target (70%)
          </div>
        </div>
      </div>

      <div className="insight-banner insight-banner-full">
        <InfoIcon />
        <div>
          Accreditation frameworks require <strong>longitudinal evidence</strong> of outcome monitoring ("closing the loop"). Only evaluation periods sharing the same criteria template are compared.
        </div>
      </div>

      {/* ══════ SECTION 06: Group-Level Attainment ══════ */}
      <div className="analytics-section" id="ans-reliability">
        <div className="analytics-section-title">
          <span className="section-num">06</span>Group-Level Attainment
        </div>
      </div>

      <div className="chart-card-v2" style={{ marginBottom: 18 }}>
        <div className="chart-header">
          <div>
            <div className="chart-title">Group Attainment Heatmap</div>
            <div className="chart-subtitle">Normalized score (%) per outcome per project group — cells below 70% threshold are flagged</div>
          </div>
        </div>
        <div className="chart-body">
          <GroupAttainmentHeatmap dashboardStats={dashboardStats} submittedData={submittedData} criteria={criteria} />
        </div>
        <div className="chart-legend">
          <div className="legend-item"><div className="legend-dot ga-cell-high" style={{ borderRadius: 2, width: 10, height: 10 }} />High (≥80%)</div>
          <div className="legend-item"><div className="legend-dot ga-cell-met" style={{ borderRadius: 2, width: 10, height: 10 }} />Met (≥70%)</div>
          <div className="legend-item"><div className="legend-dot ga-cell-borderline" style={{ borderRadius: 2, width: 10, height: 10 }} />Borderline (60–69%)</div>
          <div className="legend-item"><div className="legend-dot ga-cell-not-met" style={{ borderRadius: 2, width: 10, height: 10 }} />Not Met (&lt;60%)</div>
        </div>
      </div>

      {/* ══════ SECTION 07: Juror Reliability ══════ */}
      <div className="analytics-section">
        <div className="analytics-section-title">
          <span className="section-num">07</span>Juror Reliability
        </div>
      </div>

      <div className="chart-card-v2" style={{ marginBottom: 18 }}>
        <div className="chart-header">
          <div>
            <div className="chart-title">Inter-Rater Consistency Heatmap</div>
            <div className="chart-subtitle">Coefficient of variation (CV = σ/μ × 100%) per project group — CV &gt;25% indicates poor agreement</div>
          </div>
        </div>
        <div className="chart-body">
          <JurorConsistencyHeatmap dashboardStats={dashboardStats} submittedData={submittedData} criteria={criteria} />
        </div>
        <div className="chart-legend">
          <div className="legend-item"><div className="legend-dot" style={{ background: "rgba(22,163,74,0.5)" }} />CV &lt;10% (Excellent)</div>
          <div className="legend-item"><div className="legend-dot" style={{ background: "rgba(187,247,208,0.8)" }} />CV 10–15% (Good)</div>
          <div className="legend-item"><div className="legend-dot" style={{ background: "rgba(254,240,138,0.8)" }} />CV 15–25% (Acceptable)</div>
          <div className="legend-item"><div className="legend-dot" style={{ background: "rgba(254,202,202,0.8)" }} />CV &gt;25% (Poor)</div>
        </div>
      </div>

      {/* ══════ SECTION 08: Coverage Matrix ══════ */}
      <div className="analytics-section" id="ans-coverage">
        <div className="analytics-section-title">
          <span className="section-num">08</span>MÜDEK Outcome Coverage
        </div>
      </div>

      <div className="chart-card-v2" style={{ marginBottom: 18 }}>
        <div className="chart-header">
          <div>
            <div className="chart-title">MÜDEK 2024 Coverage Matrix</div>
            <div className="chart-subtitle">Which programme outcomes are assessed (directly / indirectly) by VERA evaluation criteria</div>
          </div>
        </div>
        <div className="chart-body" style={{ overflowX: "auto" }}>
          <CoverageMatrix criteria={criteria} />
        </div>
        <div className="chart-legend">
          <div className="legend-item"><span className="coverage-chip direct" style={{ marginRight: 4 }}>✓ Direct</span>Directly assessed</div>
          <div className="legend-item"><span className="coverage-chip indirect" style={{ marginRight: 4 }}>∼ Indirect</span>Indirect evidence</div>
          <div className="legend-item"><span className="coverage-chip none" style={{ marginRight: 4 }}>—</span>Not mapped</div>
        </div>
      </div>
    </div>
  );
}
