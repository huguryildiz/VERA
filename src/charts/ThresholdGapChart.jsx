// src/charts/ThresholdGapChart.jsx
// CSS lollipop chart: gap between criterion attainment rate and 70% threshold.
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
export function ThresholdGapChart({ submittedData = [] }) {
  const rows = submittedData || [];

  const items = CRITERIA.map((c) => {
    const vals = outcomeValues(rows, c.id);
    if (!vals.length) return { criterion: c, gap: null, attRate: null };
    const aboveThreshold = vals.filter((v) => (v / c.max) * 100 >= ATTAINMENT_THRESHOLD).length;
    const attRate = fmt1((aboveThreshold / vals.length) * 100);
    const gap = fmt1(attRate - ATTAINMENT_THRESHOLD);
    return { criterion: c, gap, attRate };
  });

  // Normalize gap to a 0–100 bar width (gap range: -70 to +30 → mapped to 0–100)
  const maxAbsGap = 30;
  const normalize = (gap) => {
    // Center at 50% (threshold = 50% of bar)
    // Each % of gap maps to 1% bar width
    const clamped = Math.max(-70, Math.min(maxAbsGap, gap));
    return 50 + (clamped / maxAbsGap) * 50;
  };

  return (
    <div className="lollipop-chart">
      {items.map(({ criterion: c, gap, attRate }) => {
        const isPositive = gap != null && gap >= 0;
        const stemLeft = gap != null ? (isPositive ? "50%" : `${normalize(gap)}%`) : "50%";
        const stemWidth = gap != null ? `${Math.abs(normalize(gap) - 50)}%` : "0%";
        const dotLeft = gap != null ? `${normalize(gap)}%` : "50%";
        const colorClass = gap == null ? "" : gap >= 0 ? "lollipop-positive" : gap >= -10 ? "lollipop-borderline" : "lollipop-negative";

        return (
          <div key={c.id} className="lollipop-row">
            <div className="lollipop-label">
              <span style={{ color: c.color }}>{c.shortLabel}</span>
            </div>
            <div className="lollipop-track">
              {/* Threshold line */}
              <div className="lollipop-threshold" />
              {/* Stem */}
              {gap != null && (
                <div
                  className={`lollipop-stem ${colorClass}`}
                  style={{ left: stemLeft, width: stemWidth }}
                />
              )}
              {/* Dot */}
              {gap != null && (
                <div
                  className={`lollipop-dot ${colorClass}`}
                  style={{ left: dotLeft }}
                />
              )}
            </div>
            <div className="lollipop-value">
              {gap != null ? (
                <span className={colorClass}>
                  {gap >= 0 ? "+" : ""}{gap}%
                </span>
              ) : (
                <span className="lollipop-na">—</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
