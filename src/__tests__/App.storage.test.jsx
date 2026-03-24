// src/__tests__/App.storage.test.jsx
// ============================================================
// Phase A safety tests — locks the App.jsx page resume/storage flow.
//
// Covers:
//   phaseA.app.01 — URL ?t= token routes to jury_gate
//   phaseA.app.02 — localStorage page restoration ("admin")
//   phaseA.app.03 — jury_gate is never written to localStorage
// ============================================================

import { afterEach, beforeEach, describe, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { qaTest } from "../test/qaTest.js";

// ── Heavy mocks (all before any import of App) ────────────────
vi.mock("../JuryForm", () => ({ default: () => <div data-testid="jury-form" /> }));
vi.mock("../AdminPanel", () => ({ default: () => <div data-testid="admin-panel" /> }));
vi.mock("../jury/JuryGatePage", () => ({ default: () => <div data-testid="jury-gate" /> }));
vi.mock("../shared/api", () => ({
  adminSecurityState: vi.fn().mockResolvedValue({ admin_password_set: true }),
  adminLogin: vi.fn().mockResolvedValue(false),
  adminBootstrapPassword: vi.fn(),
}));
vi.mock("../lib/supabaseClient", () => ({ supabase: {} }));
vi.mock("../shared/scrollIndicators", () => ({ initScrollIndicators: () => () => {} }));
vi.mock("../shared/MinimalLoaderOverlay", () => ({ default: () => null }));
vi.mock("../shared/Icons", () => ({
  ClipboardIcon:  () => null,
  ShieldUserIcon: () => null,
  AlertCircleIcon: () => null,
  EyeIcon:        () => null,
  EyeOffIcon:     () => null,
}));

// Import App AFTER all mocks are declared
import App from "../App";

// ── Helpers ───────────────────────────────────────────────────

/**
 * Override window.location.search and window.location.pathname for the
 * duration of a test, then restore afterwards.
 */
function mockLocation({ search = "", pathname = "/" } = {}) {
  const originalLocation = window.location;
  delete window.location;
  window.location = {
    ...originalLocation,
    search,
    pathname,
  };
  return () => {
    window.location = originalLocation;
  };
}

// ── Test suite ────────────────────────────────────────────────

describe("App page resume / storage flow", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  qaTest("phaseA.app.01", () => {
    const restore = mockLocation({ search: "?t=abc123", pathname: "/" });
    try {
      render(<App />);
      expect(screen.getByTestId("jury-gate")).toBeInTheDocument();
    } finally {
      restore();
    }
  });

  qaTest("phaseA.app.02", () => {
    localStorage.setItem("tedu_portal_page", "admin");
    const restore = mockLocation({ search: "", pathname: "/" });
    try {
      render(<App />);
      // When page === "admin" and not unlocked, App renders the admin login card.
      // The login card always contains a "Log In" button.
      expect(screen.getByRole("button", { name: /log in/i })).toBeInTheDocument();
    } finally {
      restore();
    }
  });

  qaTest("phaseA.app.03", () => {
    const restore = mockLocation({ search: "?t=abc", pathname: "/" });
    try {
      render(<App />);
      // App is on jury_gate. The persistence useEffect must not write "jury_gate".
      const stored = localStorage.getItem("tedu_portal_page");
      expect(stored).not.toBe("jury_gate");
    } finally {
      restore();
    }
  });
});
