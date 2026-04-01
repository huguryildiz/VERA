// src/jury/QRShowcaseStep.jsx
// ============================================================
// Demo-only step: shows how jurors access evaluations in
// production via QR code, before entering the demo flow.
// ============================================================

import { QrCodeIcon, InfoIcon } from "../shared/Icons";

export default function QRShowcaseStep({ onContinue }) {
  return (
    <div className="min-h-dvh flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-lg space-y-5">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary [&_svg]:size-6" aria-hidden="true"><QrCodeIcon /></div>
          <h1 className="text-xl font-bold">Jury Access QR Code</h1>
          <p className="text-sm text-muted-foreground">
            In production, admins generate a unique QR code for each semester.
            Jurors scan it to start their evaluation.
          </p>
        </div>

        <div className="flex justify-center py-4" aria-hidden="true">
          <svg viewBox="0 0 120 120" width="140" height="140" role="img" aria-label="Sample QR code">
            <rect width="120" height="120" rx="8" fill="#f1f5f9" />
            <g fill="#334155">
              <rect x="12" y="12" width="28" height="28" rx="4" />
              <rect x="80" y="12" width="28" height="28" rx="4" />
              <rect x="12" y="80" width="28" height="28" rx="4" />
              <rect x="16" y="16" width="20" height="20" rx="2" fill="#fff" />
              <rect x="84" y="16" width="20" height="20" rx="2" fill="#fff" />
              <rect x="16" y="84" width="20" height="20" rx="2" fill="#fff" />
              <rect x="20" y="20" width="12" height="12" rx="1" />
              <rect x="88" y="20" width="12" height="12" rx="1" />
              <rect x="20" y="88" width="12" height="12" rx="1" />
              <rect x="48" y="12" width="6" height="6" rx="1" />
              <rect x="58" y="12" width="6" height="6" rx="1" />
              <rect x="48" y="22" width="6" height="6" rx="1" />
              <rect x="68" y="22" width="6" height="6" rx="1" />
              <rect x="48" y="48" width="6" height="6" rx="1" />
              <rect x="58" y="48" width="6" height="6" rx="1" />
              <rect x="68" y="48" width="6" height="6" rx="1" />
              <rect x="48" y="58" width="6" height="6" rx="1" />
              <rect x="12" y="48" width="6" height="6" rx="1" />
              <rect x="22" y="58" width="6" height="6" rx="1" />
              <rect x="32" y="48" width="6" height="6" rx="1" />
              <rect x="80" y="48" width="6" height="6" rx="1" />
              <rect x="90" y="58" width="6" height="6" rx="1" />
              <rect x="100" y="48" width="6" height="6" rx="1" />
              <rect x="80" y="68" width="6" height="6" rx="1" />
              <rect x="90" y="80" width="6" height="6" rx="1" />
              <rect x="100" y="68" width="6" height="6" rx="1" />
              <rect x="48" y="80" width="6" height="6" rx="1" />
              <rect x="58" y="90" width="6" height="6" rx="1" />
              <rect x="68" y="80" width="6" height="6" rx="1" />
              <rect x="48" y="100" width="6" height="6" rx="1" />
              <rect x="68" y="100" width="6" height="6" rx="1" />
              <rect x="100" y="100" width="6" height="6" rx="1" />
            </g>
          </svg>
        </div>

        <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950/20 dark:border-amber-800 dark:text-amber-400">
          <span className="inline-flex shrink-0 [&_svg]:size-3.5" aria-hidden="true"><InfoIcon /></span>
          <span>This step is skipped in the demo. In production, scanning the QR grants semester-scoped access.</span>
        </div>

        <button className="w-full rounded-md bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors" type="button" onClick={onContinue}>
          Continue to Demo Evaluation
        </button>
      </div>
    </div>
  );
}
