// src/jury/steps/PinRevealStep.jsx
import { useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Copy,
  GraduationCap,
  Info,
  KeyRound,
  UserRound,
} from "lucide-react";
import "../../styles/jury.css";

export default function PinRevealStep({ state, onBack }) {
  const [copied, setCopied] = useState(false);

  const pin = state.issuedPin || "";
  const digits = pin.split("");
  const period = state.currentPeriodInfo;

  const handleCopy = () => {
    navigator.clipboard.writeText(pin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="jury-step">
      <div className="jury-card dj-glass-card" style={{ textAlign: "center" }}>
        {/* Icon */}
        <div className="jury-icon-box" style={{ margin: "0 auto 14px" }}>
          <KeyRound size={26} strokeWidth={1.5} />
        </div>

        {/* Title */}
        <div className="jury-title">Your Session PIN</div>
        <div className="jury-sub" style={{ marginBottom: 20 }}>
          Use this PIN to resume your evaluation if you get disconnected.
        </div>

        {/* PIN digits */}
        <div className="dj-pin-display">
          {(digits.length === 4 ? digits : ["-", "-", "-", "-"]).map((d, i) => (
            <div key={i} className="dj-pin-digit">{d}</div>
          ))}
        </div>

        {/* Copy PIN */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <button
            className="dj-btn-secondary"
            onClick={handleCopy}
            style={{ padding: "6px 14px", fontSize: "11px", gap: 5 }}
          >
            <Copy size={14} strokeWidth={2} />
            {copied ? "Copied!" : "Copy PIN"}
          </button>
        </div>

        {/* Juror metadata */}
        <div className="dj-pin-meta">
          <div className="dj-pin-meta-row">
            <UserRound size={16} strokeWidth={2} />
            <span className="pin-meta-label">Juror</span>
            <span className="pin-meta-value">{state.juryName}</span>
          </div>
          {period?.organizations?.institution_name && (
            <div className="dj-pin-meta-row">
              <GraduationCap size={16} strokeWidth={2} />
              <span className="pin-meta-label">Organization</span>
              <span className="pin-meta-value">
                {period.organizations.institution_name}
                {period.organizations.name ? ` — ${period.organizations.name}` : ""}
              </span>
            </div>
          )}
          {period?.name && (
            <div className="dj-pin-meta-row">
              <CalendarDays size={16} strokeWidth={2} />
              <span className="pin-meta-label">Period</span>
              <span className="pin-meta-value">{period.name}</span>
            </div>
          )}
        </div>

        {/* Info banner */}
        <div className="dj-info blue" style={{ marginTop: 16, marginBottom: 18, textAlign: "left" }}>
          <Info size={16} strokeWidth={2} />
          <span>Keep this PIN private. You will need it if you close the browser and return later.</span>
        </div>

        {/* Begin Evaluation */}
        <button
          className="dj-btn-primary"
          onClick={() => state.handlePinRevealContinue()}
          style={{ width: "100%" }}
        >
          Begin Evaluation
          <ArrowRight size={16} strokeWidth={2} style={{ marginLeft: 6 }} />
        </button>
      </div>
    </div>
  );
}
