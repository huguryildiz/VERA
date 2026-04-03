// src/jury/steps/EvalStep.jsx
import { useState, useRef } from "react";
import "../../styles/jury.css";

export default function EvalStep({ state, onBack }) {
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const scrollContainerRef = useRef(null);

  if (!state.project) {
    return (
      <div className="jury-step">
        <div className="jury-card dj-glass-card">
          <div className="jury-title">Loading...</div>
        </div>
      </div>
    );
  }

  const handleNextGroup = () => {
    if (state.current.nextProjectIndex < state.projects.length) {
      state.handleNavigate(state.current.nextProjectIndex);
    }
  };

  const handlePrevGroup = () => {
    if (state.current.prevProjectIndex >= 0) {
      state.handleNavigate(state.current.prevProjectIndex);
    }
  };

  const handleRequestSubmit = () => {
    setShowSubmitConfirm(true);
  };

  const handleConfirmSubmit = () => {
    state.handleConfirmSubmit();
    setShowSubmitConfirm(false);
  };

  return (
    <div
      id="dj-step-eval"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: "24px 16px 80px",
        position: "relative",
        zIndex: 1,
      }}
    >
      <div className="dj-eval-workspace">
        {/* Header */}
        <div className="dj-eval-header">
          <div>
            <div className="dj-eval-project-name">{state.project.title}</div>
            <div className="dj-eval-group-num">
              Group {state.current.projectIndex + 1} of {state.projects.length}
            </div>
          </div>
          <div style={{ fontSize: "12px", color: "#94a3b8" }}>
            {state.progressPct}% Complete
          </div>
        </div>

        {/* Progress bar */}
        <div className="jury-progress-bar" style={{ marginBottom: "18px" }}>
          <div
            className="jury-progress-fill"
            style={{ width: `${state.progressPct}%` }}
          />
        </div>

        {/* Criteria cards */}
        {state.effectiveCriteria.map((crit) => {
          const projId = state.project.project_id;
          const score = state.scores[projId]?.[crit.id] ?? "";

          return (
            <div key={crit.id} className="dj-crit">
              <div className="dj-crit-label">
                <span>{crit.label}</span>
                <span className="dj-crit-max">Max: {crit.max}</span>
              </div>

              <div className="dj-score-row">
                <input
                  type="number"
                  className="dj-score-input"
                  min="0"
                  max={crit.max}
                  value={score}
                  onChange={(e) =>
                    state.handleScore(projId, crit.id, e.target.value)
                  }
                  onBlur={() => state.handleScoreBlur(projId, crit.id)}
                />
                <div className="dj-score-frac">/ {crit.max}</div>
              </div>
            </div>
          );
        })}

        {/* Comment box */}
        <div className="dj-comment-box">
          <label className="dj-comment-label">Comments</label>
          <textarea
            className="dj-comment-input"
            placeholder="Any feedback for this group?"
            value={state.comments[state.project.project_id] || ""}
            onChange={(e) =>
              state.handleCommentChange(state.project.project_id, e.target.value)
            }
            onBlur={() =>
              state.handleCommentBlur(state.project.project_id)
            }
          />
        </div>
      </div>

      {/* Sticky bottom nav */}
      <div className="dj-sticky-bottom">
        <button
          className="dj-btn-secondary"
          onClick={handlePrevGroup}
          disabled={state.current.prevProjectIndex < 0}
          style={{ minWidth: "100px" }}
        >
          ← Prev
        </button>

        {state.allComplete && (
          <button
            className="dj-btn-primary"
            onClick={handleRequestSubmit}
            style={{ minWidth: "140px" }}
          >
            Submit Scores
          </button>
        )}

        {!state.allComplete && (
          <button
            className="dj-btn-secondary"
            disabled
            style={{ minWidth: "140px", opacity: 0.5 }}
          >
            (Complete all scores)
          </button>
        )}

        <button
          className="dj-btn-secondary"
          onClick={handleNextGroup}
          disabled={state.current.nextProjectIndex >= state.projects.length}
          style={{ minWidth: "100px" }}
        >
          Next →
        </button>
      </div>

      {/* Submit confirmation overlay */}
      {showSubmitConfirm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 200,
          }}
          onClick={() => setShowSubmitConfirm(false)}
        >
          <div
            className="jury-card dj-glass-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "400px" }}
          >
            <div className="jury-icon-box primary">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                style={{ width: "24px", height: "24px" }}
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>

            <div className="jury-title">Submit Your Scores?</div>
            <div className="jury-sub">
              You have completed all evaluations. Your scores will be saved and submitted.
            </div>

            <div style={{ display: "flex", gap: "8px", marginTop: "20px" }}>
              <button
                className="dj-btn-secondary"
                onClick={() => setShowSubmitConfirm(false)}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                className="dj-btn-primary"
                onClick={handleConfirmSubmit}
                style={{ flex: 1 }}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
