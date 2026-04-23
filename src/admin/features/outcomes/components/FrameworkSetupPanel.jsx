import { useNavigate } from "react-router-dom";
import { CalendarDays, Info, Plus, Route } from "lucide-react";

export default function FrameworkSetupPanel({
  variant,
  showFwPicker,
  setShowFwPicker,
  periodsWithFrameworks,
  effectivePlatformFrameworks,
  frameworks,
  pendingImport,
  onStartBlank,
  onCloneFromPeriod,
  onCloneTemplate,
  onAddDrawerOpen,
}) {
  const navigate = useNavigate();

  if (variant === "noPeriods") {
    return (
      <div style={{ padding: "48px 24px", display: "flex", justifyContent: "center" }}>
        <div className="vera-es-card">
          <div className="vera-es-hero vera-es-hero--fw">
            <div className="vera-es-icon">
              <CalendarDays size={24} strokeWidth={1.65} />
            </div>
            <div>
              <div className="vera-es-title">No evaluation periods yet</div>
              <div className="vera-es-desc">
                Create an evaluation period first, then assign an accreditation framework to track programme outcomes.
              </div>
            </div>
          </div>
          <div className="vera-es-actions">
            <button
              className="vera-es-action vera-es-action--primary-fw"
              onClick={() => navigate("../periods")}
            >
              <div className="vera-es-num vera-es-num--fw"><Plus size={14} strokeWidth={2.5} /></div>
              <div className="vera-es-action-text">
                <div className="vera-es-action-label">Go to Evaluation Periods</div>
                <div className="vera-es-action-sub">Create a period to unlock outcome configuration</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (variant === "noperiodSelected") {
    return (
      <div style={{ padding: "48px 24px", display: "flex", justifyContent: "center" }}>
        <div className="vera-es-card">
          <div className="vera-es-hero vera-es-hero--fw">
            <div className="vera-es-icon">
              <CalendarDays size={24} strokeWidth={1.65} />
            </div>
            <div>
              <div className="vera-es-title">No period selected</div>
              <div className="vera-es-desc">Select an evaluation period from the selector above to manage its outcomes and mappings.</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === "noFramework") {
    return (
      <div style={{ padding: "48px 24px", display: "flex", justifyContent: "center" }}>
        <div className="vera-es-card">
          <div className="vera-es-hero vera-es-hero--fw">
            <div className="vera-es-icon">
              <Route size={24} strokeWidth={1.65} />
            </div>
            <div>
              <div className="vera-es-title">No framework assigned to this period</div>
              <div className="vera-es-desc">
                A framework defines programme outcomes and criterion mappings.
                Required for accreditation analytics and reporting.
              </div>
            </div>
          </div>
          <div className="vera-es-actions">
            <button
              className={`vera-es-action vera-es-action--primary-fw${showFwPicker ? " vera-es-action--expanded" : ""}`}
              onClick={() => {
                if (periodsWithFrameworks.length > 0 || effectivePlatformFrameworks.length > 0) {
                  setShowFwPicker((s) => !s);
                } else {
                  onAddDrawerOpen();
                }
              }}
            >
              <div className="vera-es-num vera-es-num--fw">1</div>
              <div className="vera-es-action-text">
                <div className="vera-es-action-label">Start from an existing framework</div>
                <div className="vera-es-action-sub">
                  {periodsWithFrameworks.length > 0
                    ? "Clone from a previous period or use a platform template"
                    : "Pick a platform template with predefined outcomes"}
                </div>
              </div>
              <span className="vera-es-badge vera-es-badge--fw">Recommended</span>
            </button>
            {showFwPicker && (
              <div className="vera-es-clone-list vera-es-clone-list--fw">
                {periodsWithFrameworks.length > 0 && (
                  <>
                    <div className="vera-es-clone-list-label">Clone from a previous period</div>
                    <div className="vera-es-clone-scroll">
                      {periodsWithFrameworks.map((p) => {
                        const fwName = frameworks.find((f) => f.id === p.framework_id)?.name || "Custom Outcome";
                        return (
                          <button
                            key={p.id}
                            className="vera-es-clone-item"
                            onClick={() => onCloneFromPeriod(p)}
                          >
                            <div>
                              <div className="vera-es-clone-name">{p.name}</div>
                              <div className="vera-es-clone-meta">{fwName}</div>
                            </div>
                            <span className="vera-es-clone-cta">Clone</span>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
                {effectivePlatformFrameworks.length > 0 && (
                  <>
                    <div className="vera-es-clone-list-label" style={{ paddingTop: periodsWithFrameworks.length > 0 ? 8 : 0 }}>
                      {periodsWithFrameworks.length > 0 ? "or use a default template" : "Default templates"}
                    </div>
                    {effectivePlatformFrameworks.map((fw) => (
                      <button
                        key={fw.id}
                        type="button"
                        className="vera-es-clone-item"
                        onClick={() => onCloneTemplate(fw)}
                      >
                        <div>
                          <div className="vera-es-clone-name">{fw.name}</div>
                          {fw.description && (
                            <div className="vera-es-clone-meta">{fw.description}</div>
                          )}
                        </div>
                        <span className="vera-es-clone-cta">Use</span>
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
            <div className="vera-es-divider">or</div>
            <button
              className="vera-es-action vera-es-action--secondary"
              onClick={onStartBlank}
            >
              <div className="vera-es-num vera-es-num--secondary">2</div>
              <div className="vera-es-action-text">
                <div className="vera-es-action-label">Start from blank</div>
                <div className="vera-es-action-sub">Add your own outcomes from scratch</div>
              </div>
              <span className="vera-es-badge vera-es-badge--secondary">Manual</span>
            </button>
          </div>
          <div className="vera-es-footer">
            <Info size={12} strokeWidth={2} />
            Optional step · Recommended for accreditation
          </div>
        </div>
      </div>
    );
  }

  if (variant === "pendingImport") {
    return (
      <div style={{ padding: "48px 24px", display: "flex", justifyContent: "center" }}>
        <div className="vera-es-card">
          <div className="vera-es-hero vera-es-hero--fw">
            <div className="vera-es-icon">
              <Route size={24} strokeWidth={1.65} />
            </div>
            <div>
              <div className="vera-es-title">Framework ready to apply</div>
              <div className="vera-es-desc">
                <strong style={{ color: "var(--text-primary)" }}>{pendingImport.proposedName}</strong>{" "}
                {pendingImport.kind === "blank"
                  ? "will be created as a blank framework for this period. No outcomes will be added until you define them."
                  : "will be cloned as a new framework for this period, carrying the source outcomes and mappings."}
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

  return null;
}
