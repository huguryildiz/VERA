// src/charts/JurorConsistencyHeatmap.jsx
// HTML table heatmap: Coefficient of Variation (CV = σ/μ × 100) per group × criterion.
// Measures inter-rater agreement; CV >25% = poor agreement.

import { CRITERIA } from "../config";
import { mean, stdDev } from "../shared/stats";

function fmt1(v) {
  return Math.round(v * 10) / 10;
}

function getCvCellStyle(cv) {
  if (cv == null) return {};
  if (cv < 10) return { background: "rgba(22,163,74,0.08)", color: "#15803d" };
  if (cv < 15) return { background: "rgba(187,247,208,0.5)", color: "#16a34a" };
  if (cv < 25) return { background: "rgba(254,240,138,0.5)", color: "#a16207" };
  return { background: "rgba(254,202,202,0.5)", color: "#dc2626" };
}

/**
 * @param {object} props
 * @param {object[]} props.dashboardStats — { id, name, count }
 * @param {object[]} props.submittedData  — score rows with projectId
 */
export function JurorConsistencyHeatmap({ dashboardStats = [], submittedData = [] }) {
  const groups = (dashboardStats || []).filter((s) => s.count > 0);
  const rows = submittedData || [];

  if (!groups.length) return null;

  return (
    <div className="ga-heatmap-wrap">
      <table className="ga-heatmap">
        <thead>
          <tr>
            <th>Criterion</th>
            {groups.map((g) => (
              <th key={g.id} title={g.title || g.name}>{(g.title || g.name)?.length > 12 ? (g.title || g.name).slice(0, 12) + "…" : (g.title || g.name)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {CRITERIA.map((c) => (
            <tr key={c.id}>
              <td style={{ fontWeight: 600 }}>
                <span
                  style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: c.color, marginRight: 5, verticalAlign: "middle" }}
                />
                {c.shortLabel}
              </td>
              {groups.map((g) => {
                const vals = rows
                  .filter((r) => r.projectId === g.id)
                  .map((r) => Number(r[c.id]))
                  .filter((v) => Number.isFinite(v));

                let cv = null;
                if (vals.length >= 2) {
                  const m = mean(vals);
                  if (m > 0) {
                    cv = fmt1((stdDev(vals, true) / m) * 100);
                  }
                }

                return (
                  <td key={g.id} style={getCvCellStyle(cv)} title={g.title || g.name}>
                    {cv != null ? `${cv}%` : "—"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
