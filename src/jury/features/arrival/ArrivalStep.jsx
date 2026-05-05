// src/jury/features/arrival/ArrivalStep.jsx
// Full-screen QR lock-in animation that auto-advances to the identity
// form after ~1.4s. During the animation window, useJuryLoading prefetches
// currentPeriodInfo so it is ready when the identity card renders.
// Clicking anywhere on the screen skips immediately.

import { useEffect } from "react";
import { Check } from "lucide-react";

const QR_PATTERN = [
  [0, 1, 0, 1, 1, 0, 0],
  [1, 0, 1, 0, 0, 1, 1],
  [0, 1, 1, 1, 0, 1, 0],
  [1, 0, 0, 1, 1, 0, 1],
  [0, 1, 0, 0, 1, 1, 0],
  [1, 0, 1, 1, 0, 0, 1],
  [0, 1, 0, 1, 0, 1, 0],
];

export default function ArrivalStep({ state }) {
  const advance = () => state.setStep("identity");

  useEffect(() => {
    const t = setTimeout(advance, 1400);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className="jury-step jav-arrival-step"
      onClick={advance}
      role="button"
      aria-label="Continue to evaluation form"
    >
      <div className="jav-wrap jav-wrap--lg" aria-hidden="true">
        <span className="jav-bracket tl" />
        <span className="jav-bracket tr" />
        <span className="jav-bracket bl" />
        <span className="jav-bracket br" />
        <div className="jav-grid">
          {QR_PATTERN.flatMap((row, r) =>
            row.map((cell, c) => (
              <span
                key={`${r}-${c}`}
                className={`jav-cell${cell ? "" : " blank"}`}
                style={{ "--i": r * 7 + c }}
              />
            ))
          )}
        </div>
        <div className="jav-finder tl" />
        <div className="jav-finder tr" />
        <div className="jav-finder bl" />
        <div className="jav-check">
          <Check size={26} strokeWidth={3} />
        </div>
        <div className="jav-burst" />
      </div>

    </div>
  );
}
