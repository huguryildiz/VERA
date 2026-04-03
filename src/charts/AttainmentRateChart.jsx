// src/charts/AttainmentRateChart.jsx
// CSS horizontal bar chart: attainment rate per criterion.
// Pure HTML/CSS — no canvas library.

import { CRITERIA } from "../config";
import { mean, outcomeValues } from "../shared/stats";

const ATTAINMENT_THRESHOLD = 70;

function fmt1(v) {
  return Math.round(v * 10) / 10;
}

/**
 * @param {object} props
 * @param {object[]} props.submittedData — score rows
 */
export function AttainmentRateChart({ submittedData = [] }) {
  const rows = submittedData || [];

  const items = CRITERIA.map((c) => {
    const vals = outcomeValues(rows, c.id);
    if (!vals.length) return { criterion: c, pct: null, aboveThreshold: null };
    const avgRaw = mean(vals);
    const pct = c.max > 0 ? fmt1((avgRaw / c.max) * 100) : 0;
    const aboveThreshold = vals.filter((v) => (v / c.max) * 100 >= ATTAINMENT_THRESHOLD).length;
    const attRate = fmt1((aboveThreshold / vals.length) * 100);
    return { criterion: c, pct: attRate, aboveThreshold, total: vals.length };
  });

  return (
    <div className="att-bar-chart">
      {items.map(({ criterion: c, pct }) => {
        const isMet = pct != null && pct >= ATTAINMENT_THRESHOLD;
        const isBorderline = pct != null && pct >= 60 && pct < ATTAINMENT_THRESHOLD;
        const statusClass = pct == null ? "att-bar-empty" : isMet ? "att-bar-met" : isBorderline ? "att-bar-borderline" : "att-bar-not-met";
        return (
          <div key={c.id} className="att-bar-row">
            <div className="att-bar-label">
              <span className="att-bar-criterion" style={{ color: c.color }}>{c.shortLabel}</span>
            </div>
            <div className="att-bar-track">
              <div
                className={`att-bar-fill ${statusClass}`}
                style={{ width: pct != null ? `${pct}%` : "0%" }}
              />
              {/* Threshold marker */}
              <div className="att-bar-threshold" style={{ left: `${ATTAINMENT_THRESHOLD}%` }} />
            </div>
            <div className="att-bar-value">
              {pct != null ? (
                <span className={statusClass}>{pct}%</span>
              ) : (
                <span className="att-bar-na">—</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
