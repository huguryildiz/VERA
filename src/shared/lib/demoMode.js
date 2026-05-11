// src/shared/lib/demoMode.js
// Single source of truth for demo mode detection.
// Derived purely from pathname: /demo/* → demo, everything else → prod.
//
// Prefer `isDemoMode()` (function) over `DEMO_MODE` (constant). The constant
// is captured at module import time and stays stale when the user navigates
// between /demo and /prod paths via SPA routing (no page reload). For example,
// landing on `/`, then clicking "Be a Juror" to /demo/eval, leaves DEMO_MODE
// = false for the rest of the session — which silently breaks demo-only
// branching in the jury hooks. `isDemoMode()` re-reads the pathname on every
// call and is always correct.

import { isDemoEnvironment } from "./environment";

export function isDemoMode() {
  return isDemoEnvironment();
}

/** @deprecated Use isDemoMode() — captured at import time, breaks across SPA navigation. */
export const DEMO_MODE = isDemoEnvironment();
