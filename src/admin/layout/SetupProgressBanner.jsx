import { useNavigate } from "react-router-dom";
import { Cog, ChevronRight, CheckCircle2, Circle } from "lucide-react";

export default function SetupProgressBanner({ basePath, steps }) {
  const navigate = useNavigate();
  const completedCount = steps.filter((s) => s.done).length;

  return (
    <div className="setup-progress-banner">
      <div className="spb-inner">
        <Cog size={13} strokeWidth={2} className="spb-icon" aria-hidden />
        <span className="spb-title">Setup</span>
        <span className="spb-count">
          {completedCount}<span className="spb-total">/{steps.length}</span>
        </span>
        <span className="spb-sep" aria-hidden>·</span>
        <div className="spb-steps">
          {steps.map((step) => (
            <span key={step.id} className={`spb-step${step.done ? " done" : ""}`}>
              {step.done
                ? <CheckCircle2 size={11} strokeWidth={2.5} aria-hidden />
                : <Circle size={11} strokeWidth={2} aria-hidden />
              }
              {step.label}
            </span>
          ))}
        </div>
      </div>
      <button
        type="button"
        className="spb-btn"
        onClick={() => navigate(`${basePath}/setup`)}
      >
        Continue Setup
        <ChevronRight size={13} strokeWidth={2.5} />
      </button>
    </div>
  );
}
