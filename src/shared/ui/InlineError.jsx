// src/shared/ui/InlineError.jsx
// Mini-alert style inline field error with icon.

import { AlertCircle } from "lucide-react";

export default function InlineError({ children, className = "" }) {
  if (!children) return null;
  return (
    <div className={`vera-inline-error ${className}`.trim()} role="alert">
      <AlertCircle size={12} strokeWidth={2} aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}
