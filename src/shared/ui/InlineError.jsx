// src/shared/ui/InlineError.jsx
// Mini-alert style inline field error with icon + left border accent.

export default function InlineError({ children, className = "" }) {
  if (!children) return null;
  return (
    <div className={`vera-inline-error ${className}`.trim()} role="alert">
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <circle cx="8" cy="8" r="7" />
        <path d="M8 5v4M8 11.5v.5" />
      </svg>
      <span>{children}</span>
    </div>
  );
}

export function CoverageBanner({ children }) {
  if (!children) return null;
  return (
    <div className="vera-coverage-banner" role="alert">
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M8 1.5L1 14h14L8 1.5z" />
        <path d="M8 6.5v3.5M8 12v.5" />
      </svg>
      <span>{children}</span>
    </div>
  );
}
