import { ClipboardList, ClipboardX, Info, Plus } from "lucide-react";
import { STARTER_CRITERIA } from "../StarterCriteriaDrawer";

export function NoPeriodsEmpty({ onNavigateToPeriods }) {
  return (
    <div style={{ padding: "48px 24px", display: "flex", justifyContent: "center" }}>
      <div className="vera-es-card">
        <div className="vera-es-hero vera-es-hero--fw">
          <div className="vera-es-icon">
            <ClipboardList size={24} strokeWidth={1.65} />
          </div>
          <div>
            <div className="vera-es-title">No evaluation periods yet</div>
            <div className="vera-es-desc">
              Create an evaluation period first — then come back here to configure its criteria.
            </div>
          </div>
        </div>
        <div className="vera-es-actions">
          <button
            className="vera-es-action vera-es-action--primary-fw"
            onClick={onNavigateToPeriods}
          >
            <div className="vera-es-num vera-es-num--fw">
              <Plus size={14} strokeWidth={2.5} />
            </div>
            <div className="vera-es-action-text">
              <div className="vera-es-action-label">Go to Evaluation Periods</div>
              <div className="vera-es-action-sub">Create a period to unlock criteria configuration</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

export function NoPeriodSelectedEmpty() {
  return (
    <div style={{ padding: "48px 24px", display: "flex", justifyContent: "center" }}>
      <div className="vera-es-card">
        <div className="vera-es-hero vera-es-hero--fw">
          <div className="vera-es-icon">
            <ClipboardList size={24} strokeWidth={1.65} />
          </div>
          <div>
            <div className="vera-es-title">No period selected</div>
            <div className="vera-es-desc">Select an evaluation period from the selector above to manage its criteria.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function NoCriteriaEmpty({
  otherPeriods,
  showClonePicker,
  onToggleClonePicker,
  onStartBlank,
  onClone,
  onApplyTemplate,
  startingBlank,
  cloneLoading,
  isLocked,
}) {
  return (
    <div style={{ padding: "48px 24px", display: "flex", justifyContent: "center" }}>
      <div className="vera-es-card">
        <div className="vera-es-hero vera-es-hero--fw">
          <div className="vera-es-icon">
            <ClipboardX size={24} strokeWidth={1.65} />
          </div>
          <div>
            <div className="vera-es-title">No criteria defined for this period</div>
            <div className="vera-es-desc">
              Criteria are the scored dimensions jurors evaluate. Each criterion has a weight and optional rubric bands.
            </div>
          </div>
        </div>
        <div className="vera-es-actions">
          <button
            className={`vera-es-action vera-es-action--primary-criteria${showClonePicker ? " vera-es-action--expanded" : ""}`}
            onClick={onToggleClonePicker}
            disabled={startingBlank || cloneLoading}
          >
            <div className="vera-es-num vera-es-num--criteria">1</div>
            <div className="vera-es-action-text">
              <div className="vera-es-action-label">Start from an existing criteria</div>
              <div className="vera-es-action-sub">
                {otherPeriods.length > 0
                  ? "Clone from a previous period or use a default template"
                  : "Use the VERA Standard template with predefined criteria"}
              </div>
            </div>
            <span className="vera-es-badge vera-es-badge--criteria">Recommended</span>
          </button>
          <div className="vera-es-divider">or</div>
          <button
            className="vera-es-action vera-es-action--secondary"
            onClick={onStartBlank}
            disabled={startingBlank || cloneLoading}
          >
            <div className="vera-es-num vera-es-num--secondary">2</div>
            <div className="vera-es-action-text">
              <div className="vera-es-action-label">Start from blank</div>
              <div className="vera-es-action-sub">
                {startingBlank ? "Setting up criteria…" : "Add your own criteria one by one with custom weights"}
              </div>
            </div>
            <span className="vera-es-badge vera-es-badge--secondary">Manual</span>
          </button>
        </div>
        {showClonePicker && (
          <div className="vera-es-clone-list">
            {otherPeriods.length > 0 && (
              <>
                <div className="vera-es-clone-list-label">Clone from a previous period</div>
                <div className="vera-es-clone-scroll">
                  {otherPeriods.map((p) => (
                    <button
                      key={p.id}
                      className="vera-es-clone-item"
                      onClick={() => onClone(p.id)}
                      disabled={cloneLoading || isLocked}
                      type="button"
                    >
                      <div>
                        <div className="vera-es-clone-name">{p.name}</div>
                        <div className="vera-es-clone-meta">
                          {p.criteria_count ?? "—"} criteria
                          {p.criteria_labels?.length > 0 && (
                            <> · {p.criteria_labels.join(", ")} · {p.criteria_total_pts} pts</>
                          )}
                        </div>
                      </div>
                      <span className="vera-es-clone-cta">Clone</span>
                    </button>
                  ))}
                </div>
              </>
            )}
            <div className="vera-es-clone-list-label" style={{ paddingTop: otherPeriods.length > 0 ? 8 : 0 }}>
              {otherPeriods.length > 0 ? "or use a default template" : "Default template"}
            </div>
            <button
              type="button"
              className="vera-es-clone-item"
              onClick={() => onApplyTemplate(STARTER_CRITERIA)}
              disabled={cloneLoading || isLocked}
            >
              <div>
                <div className="vera-es-clone-name">VERA Standard</div>
                <div className="vera-es-clone-meta">4 criteria · Written, Oral, Technical, Teamwork · 100 pts</div>
              </div>
              <span className="vera-es-clone-cta">Use</span>
            </button>
          </div>
        )}
        <div className="vera-es-footer">
          <Info size={12} strokeWidth={2} />
          Required · Weights must sum to 100 pts
        </div>
      </div>
    </div>
  );
}

export function PendingCriteriaPreview({
  kind,
  sourceLabel,
  effectiveCriteriaName,
  criteriaCount,
  totalPoints,
}) {
  return (
    <div style={{ padding: "48px 24px", display: "flex", justifyContent: "center" }}>
      <div className="vera-es-card">
        <div className="vera-es-hero vera-es-hero--fw">
          <div className="vera-es-icon">
            <ClipboardList size={24} strokeWidth={1.65} />
          </div>
          <div>
            <div className="vera-es-title">Criteria ready to apply</div>
            <div className="vera-es-desc">
              <strong style={{ color: "var(--text-primary)" }}>
                {effectiveCriteriaName || "Criteria"}
              </strong>{" "}
              {kind === "blank"
                ? "will be created as a blank criteria set for this period. No criteria will be added until you define them."
                : kind === "clone"
                ? `will be cloned from ${sourceLabel} as the criteria set for this period — ${criteriaCount} criteria totaling ${totalPoints} pts.`
                : `will be applied from ${sourceLabel} as the criteria set for this period — ${criteriaCount} criteria totaling ${totalPoints} pts.`}
              {" "}Save to apply, or Discard to cancel.
            </div>
          </div>
        </div>
        <div className="vera-es-footer">
          <Info size={12} strokeWidth={2} />
          Nothing has been written to the database yet.
        </div>
      </div>
    </div>
  );
}
