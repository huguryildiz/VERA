// src/charts/AttainmentRateChart.jsx
// CSS horizontal bar chart: attainment rate per criterion.
// Pure HTML/CSS — no canvas library.
// CSS classes match vera.css: .att-bar-fill.met/.borderline/.not-met, .att-bar-val, .att-bar-target

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
    if (!vals.length) return { criterion: c, pct: null };
    const aboveThreshold = vals.filter((v) => (v / c.max) * 100 >= ATTAINMENT_THRESHOLD).length;
    const attRate = fmt1((aboveThreshold / vals.length) * 100);
    return { criterion: c, pct: attRate };
  });

  return (
    <div className="att-bar-chart">
      {items.map(({ criterion: c, pct }) => {
        const isMet = pct != null && pct >= ATTAINMENT_THRESHOLD;
        const isBorderline = pct != null && pct >= 60 && pct < ATTAINMENT_THRESHOLD;
        // CSS expects: .att-bar-fill.met / .att-bar-fill.borderline / .att-bar-fill.not-met
        const modifier = pct == null ? "" : isMet ? "met" : isBorderline ? "borderline" : "not-met";
        return (
          <div key={c.id} className="att-bar-row">
            <div className="att-bar-label">
              <span className="code">{(c.mudek || []).map((m) => `PO ${m}`).join(" / ") || c.id}</span>
              {c.shortLabel}
            </div>
            <div className="att-bar-track">
              <div
                className={`att-bar-fill${modifier ? ` ${modifier}` : ""}`}
                style={{ width: pct != null ? `${pct}%` : "0%" }}
              >
                {/* Value label inside fill bar — matches prototype structure */}
                {pct != null && (
                  <span className={`att-bar-val${modifier ? ` ${modifier}` : ""}`}>{pct}%</span>
                )}
              </div>
              {/* Threshold marker — att-bar-target per vera.css */}
              <div className="att-bar-target" style={{ left: `${ATTAINMENT_THRESHOLD}%` }} title="Target: 70%" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
