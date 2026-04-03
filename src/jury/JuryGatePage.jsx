// src/jury/JuryGatePage.jsx
// ============================================================
// Phase 3.5 — Jury access gate.
//
// Shown when the user lands on /jury-entry.
// If a ?t= token is present, it is verified against the DB.
// On success:
//   - semester-scoped grant stored in localStorage (persists across sessions)
//   - URL cleaned to /jury-entry (token removed from address bar)
//   - onGranted() called → App sets page to "jury"
// On failure or missing token:
//   - access-required screen shown; no jury form rendered
//
// Resume (same or new browser session) is handled entirely
// by the App.jsx page initializer — this component is only
// mounted for fresh token verification.
// ============================================================

import { useEffect, useState } from "react";
import { verifyEntryToken } from "../shared/api";
import { setJuryAccess } from "../shared/storage";
import "../styles/jury.css";

export default function JuryGatePage({ token, onGranted, onBack }) {
  // "loading" → verifying token; "denied" → bad/expired token; "missing" → no token
  const [status, setStatus] = useState(token ? "loading" : "missing");

  useEffect(() => {
    if (!token) return;
    let active = true;
    verifyEntryToken(token)
      .then((res) => {
        if (!active) return;
        if (res?.ok) {
          setJuryAccess(res.period_id);
          window.history.replaceState(null, "", "/jury-entry");
          onGranted();
        } else {
          setStatus("denied");
        }
      })
      .catch(() => {
        if (active) setStatus("denied");
      });
    return () => { active = false; };
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  if (status === "loading") {
    return (
      <div className="jury-screen">
        <div className="jury-step">
          <div className="jury-card dj-glass-card" style={{ textAlign: "center" }}>
            <div className="jury-gate-spinner" />
            <div className="jury-title">Verifying access…</div>
            <div className="jury-sub">Please wait while we validate your credentials.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="jury-screen">
      <div className="jury-step">
        <div className="jury-card dj-glass-card" style={{ textAlign: "center" }}>
          <div className="jury-icon-box warn">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              style={{ width: "24px", height: "24px" }}
            >
              <path d="M12 9v2m0 4v2M7.5 2h9a2 2 0 0 1 1.8 1.1l3.2 5.8a2 2 0 0 1 0 1.8l-3.2 5.8a2 2 0 0 1-1.8 1.1h-9a2 2 0 0 1-1.8-1.1L2.5 10.7a2 2 0 0 1 0-1.8L5.7 3.1A2 2 0 0 1 7.5 2z" />
            </svg>
          </div>
          <div className="jury-title">Jury access required</div>
          <div className="jury-sub" style={{ marginBottom: "16px" }}>
            This page can only be opened with a valid jury QR code or access link
            provided by the coordinators.
          </div>

          {status === "denied" && (
            <div className="dj-error" style={{ marginBottom: "16px" }}>
              <div style={{ fontWeight: "600", marginBottom: "4px" }}>
                Access Denied
              </div>
              The link you used is invalid, expired, or has been revoked.
            </div>
          )}

          <button
            className="jury-card btn-primary"
            onClick={onBack}
            style={{ width: "100%", marginBottom: "12px" }}
          >
            ← Back to Home
          </button>

          <div style={{ fontSize: "11px", color: "#94a3b8" }}>
            If you are a walk-in juror, please contact the registration desk.
          </div>
        </div>
      </div>
    </div>
  );
}
