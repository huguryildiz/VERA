// src/jury/steps/AdminImpactStep.jsx
// ============================================================
// Admin Impact — post-submission showcase step.
// Fetches live period data and shows before/after impact of the
// juror's scores on rankings, completion, and mean scores.
// ============================================================

import { useState, useEffect, useCallback } from "react";
import {
  BarChart3,
  Check,
  Clock,
  Eye,
  Home,
  ShieldCheck,
  TrendingUp,
  UserPlus,
} from "lucide-react";
import { getPeriodImpact } from "../../shared/api";
import { isDemoEnvironment } from "../../shared/lib/environment";
import "../../styles/jury.css";

// ── helpers ──────────────────────────────────────────────────

function formatTimeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// rpcData shape:
//   { total_projects, projects: [{id,title,group_no,juror_count,avg_total}],
//     juror_scores: [{juror_id,project_id,total}],
//     jurors: [{juror_id,juror_name,last_seen_at,final_submitted_at,completed_projects}] }
function computeImpactData(rpcData, jurorId) {
  const projects      = rpcData.projects      || [];
  const jurorScores   = rpcData.juror_scores  || [];
  const jurorsSummary = rpcData.jurors        || [];
  const totalProjects = rpcData.total_projects ?? projects.length;

  // -- "After" state --
  const scoredProjects = projects.filter((p) => p.juror_count > 0);
  const completionAfter =
    totalProjects > 0 ? Math.round((scoredProjects.length / totalProjects) * 100) : 0;

  const withAvg = projects.filter((p) => p.avg_total != null);
  const meanAfter =
    withAvg.length > 0
      ? (withAvg.reduce((s, p) => s + Number(p.avg_total), 0) / withAvg.length).toFixed(1)
      : "—";

  const activeJurors = jurorsSummary.filter(
    (j) => j.completed_projects > 0 || j.final_submitted_at
  ).length;

  // Rankings sorted desc by avg_total (RPC already sorts, but re-sort to be safe)
  const rankingsAfter = [...projects]
    .filter((p) => p.avg_total != null)
    .sort((a, b) => Number(b.avg_total) - Number(a.avg_total))
    .map((p, i) => ({
      rank: i + 1,
      id: p.id,
      name: p.title || `Project ${p.project_no}`,
      score: Number(p.avg_total).toFixed(1),
      count: p.juror_count,
    }));

  // -- "Before" state (exclude current juror's contribution) --
  const myScoreRows = jurorScores.filter((r) => r.juror_id === jurorId);
  const jurorScoredProjectIds = new Set(myScoreRows.map((r) => r.project_id));

  const beforeProjectAvgs = projects.map((p) => {
    const hadMyScore = jurorScoredProjectIds.has(p.id);
    if (!hadMyScore || p.juror_count <= 1) {
      return {
        ...p,
        avgBefore: hadMyScore ? null : p.avg_total != null ? Number(p.avg_total) : null,
        countBefore: hadMyScore ? 0 : p.juror_count,
      };
    }
    const myRow    = myScoreRows.find((r) => r.project_id === p.id);
    const myTotal  = myRow ? Number(myRow.total) : 0;
    const newCount = p.juror_count - 1;
    const newAvg   = (Number(p.avg_total) * p.juror_count - myTotal) / newCount;
    return { ...p, avgBefore: newAvg, countBefore: newCount };
  });

  const scoredBefore = beforeProjectAvgs.filter((p) => p.countBefore > 0).length;
  const completionBefore =
    totalProjects > 0 ? Math.round((scoredBefore / totalProjects) * 100) : 0;

  const withAvgBefore = beforeProjectAvgs.filter((p) => p.avgBefore != null);
  const meanBefore =
    withAvgBefore.length > 0
      ? (withAvgBefore.reduce((s, p) => s + p.avgBefore, 0) / withAvgBefore.length).toFixed(1)
      : "—";

  const rankingsBefore = [...beforeProjectAvgs]
    .filter((p) => p.avgBefore != null)
    .sort((a, b) => b.avgBefore - a.avgBefore)
    .map((p, i) => ({
      rank: i + 1,
      id: p.id,
      name: p.title || `Project ${p.project_no}`,
      score: p.avgBefore.toFixed(1),
      count: p.countBefore,
    }));

  const rankDeltas = {};
  for (const pid of jurorScoredProjectIds) {
    const before = rankingsBefore.find((r) => r.id === pid);
    const after  = rankingsAfter.find((r) => r.id === pid);
    if (before && after) rankDeltas[pid] = before.rank - after.rank;
  }

  // Impact tags
  const impactTags = [];
  for (const pid of jurorScoredProjectIds) {
    const delta = rankDeltas[pid];
    if (delta && delta !== 0) {
      const proj = projects.find((p) => p.id === pid);
      const name = proj?.title || `Group ${proj?.group_no}`;
      impactTags.push({ icon: "rank", text: `${delta > 0 ? "+" : ""}${delta} rank for ${name}` });
    }
  }
  if (completionAfter !== completionBefore) {
    impactTags.push({ icon: "completion", text: `Completion: ${completionBefore}% \u2192 ${completionAfter}%` });
  }
  if (meanBefore !== "—" && meanAfter !== "—" && meanBefore !== meanAfter) {
    impactTags.push({ icon: "mean", text: `Mean: ${meanBefore} \u2192 ${meanAfter}` });
  }

  // Activity feed
  const activity = jurorsSummary
    .filter((j) => j.last_seen_at)
    .sort((a, b) => new Date(b.last_seen_at) - new Date(a.last_seen_at))
    .slice(0, 6)
    .map((j) => ({
      name: j.juror_name || "Unknown",
      action: j.final_submitted_at
        ? `scored ${j.completed_projects} group${j.completed_projects !== 1 ? "s" : ""}`
        : j.completed_projects > 0
          ? "scoring in progress"
          : "joined session",
      time: formatTimeAgo(j.last_seen_at),
      type: j.final_submitted_at ? "scored" : j.completed_projects > 0 ? "progress" : "joined",
      highlight: j.juror_id === jurorId,
    }));

  return {
    totalProjects,
    activeJurors,
    completionAfter,
    completionBefore,
    meanAfter,
    meanBefore,
    rankingsAfter,
    rankingsBefore,
    impactTags,
    activity,
    jurorScoredProjectIds,
    rankDeltas,
  };
}

// ── component ────────────────────────────────────────────────

export default function AdminImpactStep({ state, onBack }) {
  const [view, setView] = useState("after"); // "before" | "after"
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const periodId     = state.periodId;
  const jurorId      = state.jurorId;
  const sessionToken = state.jurorSessionToken;

  // Fetch data on mount
  useEffect(() => {
    if (!periodId || !sessionToken) return;
    let active = true;

    async function load() {
      try {
        const rpcData = await getPeriodImpact(periodId, sessionToken);
        if (!active) return;
        setData(computeImpactData(rpcData, jurorId));
      } catch (err) {
        if (active) setError(err.message || "Failed to load impact data");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => { active = false; };
  }, [periodId, jurorId, sessionToken]);

  const handleReturnHome = useCallback(() => {
    state.clearLocalSession();
    onBack();
  }, [state, onBack]);

  const handleAdminSignIn = useCallback(() => {
    state.clearLocalSession();
    const param = isDemoEnvironment() ? "?explore" : "?admin";
    window.location.href = window.location.pathname + param;
  }, [state]);

  const handleBackToDone = useCallback(() => {
    state.setStep("done");
  }, [state]);

  // Loading state
  if (loading) {
    return (
      <div className="jury-step" id="dj-step-admin" style={{ justifyContent: "flex-start", paddingTop: 32 }}>
        <div className="dj-admin-wrap" style={{ textAlign: "center", paddingTop: 48 }}>
          <div className="jury-gate-spinner" />
          <div className="dj-h1" style={{ marginTop: 16 }}>Loading Impact Data</div>
          <div className="dj-sub">Fetching live dashboard metrics...</div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <div className="jury-step" id="dj-step-admin" style={{ justifyContent: "flex-start", paddingTop: 32 }}>
        <div className="dj-admin-wrap" style={{ textAlign: "center", paddingTop: 48 }}>
          <div className="dj-h1">Unable to Load</div>
          <div className="dj-sub" style={{ marginBottom: 16 }}>{error || "No data available."}</div>
          <div className="dj-btn-row" style={{ justifyContent: "center" }}>
            <button className="dj-btn-secondary" onClick={handleBackToDone}>
              Back to Summary
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isAfter = view === "after";
  const rankings = isAfter ? data.rankingsAfter : data.rankingsBefore;
  const completion = isAfter ? data.completionAfter : data.completionBefore;
  const mean = isAfter ? data.meanAfter : data.meanBefore;

  return (
    <div className="jury-step" id="dj-step-admin" style={{ justifyContent: "flex-start", paddingTop: 16 }}>
      <div className="dj-admin-wrap">

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <span className="dj-badge" style={{ marginBottom: 8 }}>
            <Eye size={12} strokeWidth={2} style={{ marginRight: 4, verticalAlign: -1 }} />
            Admin View
          </span>
          <div className="dj-h1" style={{ marginTop: 8 }}>Admin Panel &mdash; Score Impact</div>
          <div className="dj-sub">See how your evaluation affected the admin dashboard in real time.</div>
        </div>

        {/* Before / After toggle */}
        <div className="dj-ba-bar">
          <button
            className={`dj-ba-btn${view === "before" ? " active" : ""}`}
            onClick={() => setView("before")}
          >
            Before Your Score
          </button>
          <button
            className={`dj-ba-btn${view === "after" ? " active" : ""}`}
            onClick={() => setView("after")}
          >
            After Your Score &#10022;
          </button>
        </div>

        {/* Impact tags (only in "after" view) */}
        <div className="dj-your-impact-strip">
          {isAfter ? (
            data.impactTags.length > 0 ? (
              data.impactTags.map((tag, i) => (
                <span key={i} className="dj-impact-tag">
                  {tag.icon === "rank" && <Check size={12} strokeWidth={2.5} />}
                  {tag.icon === "completion" && <BarChart3 size={12} strokeWidth={2.5} />}
                  {tag.icon === "mean" && <TrendingUp size={12} strokeWidth={2.5} />}
                  {tag.text}
                </span>
              ))
            ) : (
              <span className="dj-impact-tag">Your scores are now live</span>
            )
          ) : (
            <span className="dj-impact-tag" style={{
              background: "rgba(148,163,184,0.08)",
              color: "#94a3b8",
              borderColor: "rgba(148,163,184,0.12)",
            }}>
              Before your evaluation was recorded
            </span>
          )}
        </div>

        {/* KPI strip */}
        <div className="dj-impact-strip">
          <div className="dj-impact-kpi">
            <div className="dj-impact-kpi-val">
              <span className="accent">{data.totalProjects}</span>
            </div>
            <div className="dj-impact-kpi-lbl">Project Groups</div>
          </div>
          <div className="dj-impact-kpi">
            <div className="dj-impact-kpi-val">
              <span className={isAfter ? "up" : ""}>{completion}%</span>
            </div>
            <div className="dj-impact-kpi-lbl">Completion</div>
          </div>
          <div className="dj-impact-kpi">
            <div className="dj-impact-kpi-val">{mean}</div>
            <div className="dj-impact-kpi-lbl">Mean Score</div>
          </div>
          <div className="dj-impact-kpi">
            <div className="dj-impact-kpi-val">{data.activeJurors}</div>
            <div className="dj-impact-kpi-lbl">Active Jurors</div>
          </div>
        </div>

        {/* Two-column grid */}
        <div className="dj-impact-grid">

          {/* Live Rankings */}
          <div className="dj-impact-panel">
            <div className="dj-impact-title">
              <BarChart3 size={14} strokeWidth={2} />
              Live Rankings
            </div>
            {rankings.length === 0 ? (
              <div style={{ fontSize: 11, color: "#64748b", padding: "12px 0" }}>
                No scored projects yet.
              </div>
            ) : (
              rankings.map((r) => {
                const isJurorProject = data.jurorScoredProjectIds.has(r.id);
                const delta = isAfter ? (data.rankDeltas[r.id] || 0) : 0;
                return (
                  <div
                    key={r.id}
                    className={`dj-rank-row${isJurorProject && isAfter ? " hl" : ""}`}
                  >
                    <span className="dj-rank-num">{r.rank}</span>
                    <span className="dj-rank-name">
                      {r.name}
                      {isJurorProject && isAfter ? " \u2605" : ""}
                    </span>
                    <span className="dj-rank-score">{r.score}</span>
                    {delta !== 0 && (
                      <span className={`dj-rank-delta ${delta > 0 ? "up" : "down"}`}>
                        {delta > 0 ? "\u25B2" : "\u25BC"} {Math.abs(delta)}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Live Activity */}
          <div className="dj-impact-panel">
            <div className="dj-impact-title">
              <Clock size={14} strokeWidth={2} />
              Live Activity
            </div>
            {data.activity.length === 0 ? (
              <div style={{ fontSize: 11, color: "#64748b", padding: "12px 0" }}>
                No recent activity.
              </div>
            ) : (
              data.activity.map((a, i) => (
                <div key={i} className="dj-act-item">
                  <div className={`dj-act-icon ${
                    a.type === "scored" ? "blue"
                    : a.type === "progress" ? "green"
                    : "purple"
                  }`}>
                    {a.type === "scored" && <Check size={12} strokeWidth={2.5} />}
                    {a.type === "progress" && <TrendingUp size={12} strokeWidth={2.5} />}
                    {a.type === "joined" && <UserPlus size={12} strokeWidth={2.5} />}
                  </div>
                  <div>
                    <div>
                      <strong style={{ color: a.highlight ? "#60a5fa" : undefined }}>
                        {a.name}
                      </strong>{" "}
                      {a.action}
                    </div>
                    <div className="dj-act-time">{a.time}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* CTA buttons */}
        <div className="dj-btn-row" style={{ marginTop: 24 }}>
          <button className="dj-btn-secondary" onClick={handleAdminSignIn}>
            <Eye size={14} strokeWidth={2} />
            Explore Admin Panel
          </button>
          <button className="dj-btn-secondary" onClick={handleReturnHome}>
            <Home size={14} strokeWidth={2} />
            Return Home
          </button>
        </div>

      </div>
    </div>
  );
}
