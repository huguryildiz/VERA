// src/charts/GroupAttainmentHeatmap.jsx
// HTML table heatmap: normalized score (%) per outcome per project group.
// Cells below 70% threshold are flagged with colour coding.

import { CRITERIA } from "../config";
import { mean } from "../shared/stats";

const ATTAINMENT_THRESHOLD = 70;

function fmt1(v) {
  return Math.round(v * 10) / 10;
}

function getCellClass(pct) {
  if (pct == null) return "";
  if (pct >= 80) return "ga-cell-high";
  if (pct >= ATTAINMENT_THRESHOLD) return "ga-cell-met";
  if (pct >= 60) return "ga-cell-borderline";
  return "ga-cell-not-met";
}

/**
 * @param {object} props
 * @param {object[]} props.dashboardStats — { id, name, count, avg }
 * @param {object[]} props.submittedData  — score rows
 */
export function GroupAttainmentHeatmap({ dashboardStats = [], submittedData = [] }) {
  const groups = (dashboardStats || []).filter((s) => s.count > 0);
  if (!groups.length) return null;

  // Build per-group per-criterion attainment (% of threshold met)
  const rows_data = submittedData || [];

  // For each MÜDEK outcome code, compute attainment from relevant criteria
  // In this layout: rows are MÜDEK outcomes derived from criteria, columns are groups
  // We compute per-criterion average per group using dashboardStats.avg

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
              <td>
                <span className="ga-criterion-swatch" style={{ background: c.color }} />
                {c.shortLabel}
              </td>
              {groups.map((g) => {
                const avgRaw = Number(g.avg?.[c.id] ?? null);
                const pct = Number.isFinite(avgRaw) && c.max > 0
                  ? fmt1((avgRaw / c.max) * 100)
                  : null;
                return (
                  <td key={g.id} className={getCellClass(pct)} title={g.title || g.name}>
                    {pct != null ? `${pct}%` : "—"}
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
