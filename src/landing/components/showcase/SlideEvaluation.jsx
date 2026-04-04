import React from "react";
import { PROJECTS, HEATMAP_DATA, REVIEW_ROWS, CRITERIA } from "./showcaseData";

const HEAT_COLORS = [
  { min: 0, color: "#ef4444" },
  { min: 60, color: "#f59e0b" },
  { min: 70, color: "#eab308" },
  { min: 80, color: "#22c55e" },
  { min: 90, color: "#16a34a" },
];

function heatColor(score) {
  let c = HEAT_COLORS[0].color;
  for (const h of HEAT_COLORS) {
    if (score >= h.min) c = h.color;
  }
  return c;
}

export default function SlideEvaluation() {
  const topProjects = PROJECTS.slice(0, 4);
  const heatJurors = ["EA", "MY", "SK"];

  return (
    <div className="ps-window">
      <div className="ps-toolbar">
        <div className="ps-toolbar-dots"><span /><span /><span /></div>
        <span className="ps-toolbar-label">evaluation</span>
      </div>
      <div className="ps-body">
        <div className="ps-eval-grid">
          {/* Rankings mini-panel */}
          <div className="ps-eval-panel">
            <div className="ps-eval-panel-title">Rankings</div>
            <div className="ps-mini-bars">
              {topProjects.map((p) => (
                <div key={p.code} className="ps-mini-bar-col">
                  <span className="ps-mini-bar-score">{p.score}</span>
                  <div
                    className="ps-mini-bar"
                    style={{
                      height: `${((p.score - 60) / 35) * 100}%`,
                      background: `linear-gradient(180deg, ${heatColor(p.score)}, ${heatColor(p.score)}99)`,
                    }}
                  />
                  <span className="ps-mini-bar-label">{p.title.split(" ")[0]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Heatmap mini-panel */}
          <div className="ps-eval-panel">
            <div className="ps-eval-panel-title">Heatmap</div>
            <div className="ps-mini-heatmap">
              <div className="ps-heatmap-corner" />
              {topProjects.slice(0, 4).map((p) => (
                <div key={p.code} className="ps-heatmap-col-header">{p.code}</div>
              ))}
              {HEATMAP_DATA.map((row, ri) => (
                <React.Fragment key={ri}>
                  <div className="ps-heatmap-row-header">{heatJurors[ri]}</div>
                  {row.map((val, ci) => (
                    <div
                      key={ci}
                      className="ps-heatmap-cell"
                      style={{ background: `${heatColor(val)}22`, color: heatColor(val) }}
                    >
                      {val}
                    </div>
                  ))}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* Reviews mini-panel */}
        <div className="ps-eval-reviews">
          <div className="ps-eval-panel-title">Reviews</div>
          {REVIEW_ROWS.map((r) => (
            <div key={r.juror + r.project} className="ps-review-row">
              <div className="ps-review-juror">
                <div className="ps-review-avatar" style={{ background: `linear-gradient(135deg, ${r.color}, ${r.color}cc)` }}>{r.initials}</div>
                <span className="ps-review-name">{r.juror.split(" ").slice(0, 2).join(" ")}</span>
              </div>
              <span className="ps-review-project">{r.project}</span>
              <div className="ps-review-scores">
                {r.scores.map((s, i) => (
                  <span key={i} className="ps-review-score" style={{ color: CRITERIA[i]?.color }}>{s}</span>
                ))}
              </div>
              <span className="ps-badge success">Done</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
