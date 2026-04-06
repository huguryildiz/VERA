// src/jury/steps/LockedStep.jsx
import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import "../../styles/jury.css";

export default function LockedStep({ state, onBack }) {
  const [remainingTime, setRemainingTime] = useState(0);

  useEffect(() => {
    if (!state.pinLockedUntil) return;

    const interval = setInterval(() => {
      const now = new Date();
      const lockUntil = new Date(state.pinLockedUntil);
      const diff = Math.max(0, Math.floor((lockUntil - now) / 1000 / 60));
      setRemainingTime(diff);

      if (diff === 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [state.pinLockedUntil]);

  return (
    <div className="jury-step">
      <div className="jury-card dj-glass-card">
        <div className="jury-icon-box warn">
          <AlertTriangle size={24} strokeWidth={1.5} />
        </div>

        <div className="jury-title">Too Many Attempts</div>
        <div className="jury-sub">
          Your account has been temporarily locked due to too many failed PIN attempts.
        </div>

        <div className="jury-lockout-container">
          <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "24px", marginBottom: "8px" }}>
            Please try again in
          </div>
          <div className="jury-lockout-time">
            {remainingTime} min
          </div>
          <div style={{ fontSize: "11px", color: "#94a3b8" }}>
            {remainingTime === 1 ? "minute" : "minutes"}
          </div>
        </div>

        <button
          className="dj-btn-secondary"
          onClick={onBack}
          style={{ width: "100%", marginTop: "32px" }}
        >
          ← Back
        </button>
      </div>
    </div>
  );
}
