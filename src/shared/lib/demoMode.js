// src/lib/demoMode.js
// Single source of truth for demo mode detection.
// Priority: ?explore URL param > VITE_DEMO_MODE env var (local dev fallback).
// Import DEMO_MODE from here instead of reading import.meta.env directly.

export const DEMO_MODE =
  (typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has("explore")) ||
  import.meta.env.VITE_DEMO_MODE === "true";
