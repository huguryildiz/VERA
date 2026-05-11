// src/jury/features/arrival/ArrivalStep.jsx
// Full-screen QR lock-in animation that holds until the period's data has
// been prefetched, then auto-advances to the identity form. This makes the
// arrival screen *be* the loading screen: while the QR is animating, the
// JuryGatePage's prefetch is filling the cache, and we wait for it before
// progressing so the identity form opens with everything ready.
//
// Timing rules:
//   - Minimum visible time: 2.4s (lets the user read "Preparing…" and see
//     the animation play out — feels intentional, not a flash).
//   - Cache wait: poll peekJuryPreload(periodId) until `projects` lands.
//   - Hard ceiling: 6s so we never strand the user if prefetch fails.
//   - Tap to skip remains available (mirrors prior UX).

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { peekJuryPreload } from "../../shared/juryPreloadCache";
import { getJuryAccess } from "@/shared/storage";

const QR_PATTERN = [
  [0, 1, 0, 1, 1, 0, 0],
  [1, 0, 1, 0, 0, 1, 1],
  [0, 1, 1, 1, 0, 1, 0],
  [1, 0, 0, 1, 1, 0, 1],
  [0, 1, 0, 0, 1, 1, 0],
  [1, 0, 1, 1, 0, 0, 1],
  [0, 1, 0, 1, 0, 1, 0],
];

const MIN_VISIBLE_MS = 3000;
const MAX_WAIT_MS = 6000;
const POLL_MS = 100;

export default function ArrivalStep({ state }) {
  const [statusLabel, setStatusLabel] = useState("Preparing your evaluation…");

  useEffect(() => {
    let cancelled = false;
    let timer = null;
    const startedAt = Date.now();
    const periodId = getJuryAccess();

    const finish = () => {
      if (cancelled) return;
      cancelled = true;
      state.setStep("identity");
    };

    const tick = () => {
      if (cancelled) return;
      const elapsed = Date.now() - startedAt;
      const cached = peekJuryPreload(periodId);
      const cacheReady = Array.isArray(cached?.projects) && cached.projects.length > 0;

      if (elapsed >= MIN_VISIBLE_MS && cacheReady) return finish();
      if (elapsed >= MAX_WAIT_MS) return finish();

      // Switch the label once the minimum visible window has passed but we're
      // still waiting on the cache — gives the user a sense of progress.
      if (elapsed >= MIN_VISIBLE_MS && !cacheReady) {
        setStatusLabel("Almost ready…");
      }
      timer = setTimeout(tick, POLL_MS);
    };

    timer = setTimeout(tick, POLL_MS);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const skip = () => state.setStep("identity");

  return (
    <div
      className="jury-step jav-arrival-step"
      data-testid="jury-arrival-step"
      onClick={skip}
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
      <div className="jav-status" aria-live="polite">{statusLabel}</div>
    </div>
  );
}
