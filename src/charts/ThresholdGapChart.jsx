// src/charts/ThresholdGapChart.jsx
// CSS diverging lollipop chart: gap between criterion attainment rate and 70% threshold.
// Pure HTML/CSS — no canvas library.
// CSS classes match vera.css: .lollipop-stem.positive/.negative, .lollipop-dot.positive/.negative,
// .lollipop-val.positive/.negative (positioned inside .lollipop-track)

import { CRITERIA } from "../config";
import { outcomeValues } from "../shared/stats";

const ATTAINMENT_THRESHOLD = 70;
// Max absolute gap displayed (bars beyond this are clamped)
const MAX_ABS_GAP = 30;

function fmt1(v) {
  return Math.round(v * 10) / 10;
}

// Normalize gap to 0–100 bar position (center = 50% = threshold)
function normalize(gap) {
  const clamped = Math.max(-MAX_ABS_GAP, Math.min(MAX_ABS_GAP, gap));
  return 50 + (clamped / MAX_ABS_GAP) * 50;
}

/**
 * @param {object} props
 * @param {object[]} props.submittedData — score rows
 */
export function ThresholdGapChart({ submittedData = [] }) {
  const rows = submittedData || [];

  const items = CRITERIA.map((c) => {
    const vals = outcomeValues(rows, c.id);
    if (!vals.length) return { criterion: c, gap: null };
    const aboveThreshold = vals.filter((v) => (v / c.max) * 100 >= ATTAINMENT_THRESHOLD).length;
    const attRate = fmt1((aboveThreshold / vals.length) * 100);
    const gap = fmt1(attRate - ATTAINMENT_THRESHOLD);
    return { criterion: c, gap };
  });

  return (
    <div className="lollipop-chart">
      {items.map(({ criterion: c, gap }) => {
        // vera.css uses .lollipop-stem.positive / .lollipop-stem.negative (not lollipop-positive)
        const modifier = gap == null ? "" : gap >= 0 ? "positive" : "negative";
        const stemLeft = gap != null ? (gap >= 0 ? "50%" : `${normalize(gap)}%`) : "50%";
        const stemWidth = gap != null ? `${Math.abs(normalize(gap) - 50)}%` : "0%";
        const dotLeft = gap != null ? `${normalize(gap)}%` : "50%";
        // Position value label slightly offset from dot
        const valLeft = gap != null ? (gap >= 0 ? `${normalize(gap) + 3}%` : `${normalize(gap) - 3}%`) : "50%";

        return (
          <div key={c.id} className="lollipop-row">
            <div className="lollipop-label">
              <span style={{ color: c.color }}>{c.shortLabel}</span>
            </div>
            <div className="lollipop-track">
              {/* Center threshold line */}
              <div className="lollipop-center" />
              {/* Stem */}
              {gap != null && (
                <div
                  className={`lollipop-stem${modifier ? ` ${modifier}` : ""}`}
                  style={{ left: stemLeft, width: stemWidth }}
                />
              )}
              {/* Dot */}
              {gap != null && (
                <div
                  className={`lollipop-dot${modifier ? ` ${modifier}` : ""}`}
                  style={{ left: dotLeft }}
                />
              )}
              {/* Value label — absolutely positioned inside track per vera.css */}
              {gap != null ? (
                <div
                  className={`lollipop-val${modifier ? ` ${modifier}` : ""}`}
                  style={{ left: valLeft }}
                >
                  {gap >= 0 ? "+" : ""}{gap}%
                </div>
              ) : (
                <div className="lollipop-val" style={{ left: "52%", color: "var(--text-tertiary)" }}>—</div>
              )}
            </div>
          </div>
        );
      })}
      <div className="lollipop-axis-labels">
        <span>−{MAX_ABS_GAP}</span>
        <span>−{MAX_ABS_GAP / 2}</span>
        <span style={{ fontWeight: 700, color: "var(--text-secondary)" }}>70% threshold</span>
        <span>+{MAX_ABS_GAP / 2}</span>
        <span>+{MAX_ABS_GAP}</span>
      </div>
    </div>
  );
}
