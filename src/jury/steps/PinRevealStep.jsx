// src/jury/steps/PinRevealStep.jsx
import { useState } from "react";
import "../../styles/jury.css";

export default function PinRevealStep({ state, onBack }) {
  const [copied, setCopied] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(state.issuedPin || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleContinue = () => {
    if (confirmed) {
      state.handlePinRevealContinue();
    }
  };

  return (
    <div className="jury-step">
      <div className="jury-card dj-glass-card">
        <div className="jury-icon-box success">
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

        <div className="jury-title">Your PIN is Ready</div>
        <div className="jury-sub">
          Your personal PIN for this evaluation session
        </div>

        <div
          style={{
            background: "rgba(30, 41, 59, 0.4)",
            border: "1px solid rgba(148, 163, 184, 0.08)",
            borderRadius: "10px",
            padding: "24px",
            textAlign: "center",
            margin: "20px 0",
          }}
        >
          <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "12px" }}>
            Your PIN
          </div>
          <div
            style={{
              fontSize: "42px",
              fontWeight: "700",
              fontFamily: "monospace",
              color: "#f1f5f9",
              letterSpacing: "8px",
              marginBottom: "16px",
            }}
          >
            {state.issuedPin || "----"}
          </div>
          <button
            className="dj-btn-secondary"
            onClick={handleCopy}
            style={{ width: "100%" }}
          >
            {copied ? "Copied!" : "Copy PIN"}
          </button>
        </div>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "12px",
            color: "#cbd5e1",
            marginBottom: "16px",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            style={{ width: "16px", height: "16px" }}
          />
          I have saved my PIN in a safe place
        </label>

        <button
          className="dj-btn-primary"
          onClick={handleContinue}
          disabled={!confirmed}
          style={{ width: "100%", marginTop: "16px" }}
        >
          Continue to Evaluation
        </button>

        <button
          className="dj-btn-secondary"
          onClick={onBack}
          style={{ width: "100%", marginTop: "8px" }}
        >
          ← Back
        </button>
      </div>
    </div>
  );
}
