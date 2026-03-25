// src/App.jsx
// ============================================================
// Root component — manages top-level page routing.
//
// Pages: "home" | "jury_gate" | "jury" | "admin"
//
// Phase C: Admin auth moved to Supabase Auth + JWT/session.
// - Login: email + password via supabase.auth.signInWithPassword
// - Register: self-registration + tenant application
// - Pending gate: authenticated but no approved membership
// - Jury flow: completely unchanged (no tenant exposure)
// ============================================================

import { useEffect, useState } from "react";
import JuryForm from "./JuryForm";
import JuryGatePage from "./jury/JuryGatePage";
import AdminPanel from "./AdminPanel";
import ErrorBoundary from "./shared/ErrorBoundary";
import {
  ClipboardIcon,
  ShieldUserIcon,
} from "./shared/Icons";
import { submitAdminApplication } from "./shared/api";
import { initScrollIndicators } from "./shared/scrollIndicators";
import MinimalLoaderOverlay from "./shared/MinimalLoaderOverlay";
import { getPage, setPage as persistPage, getJuryAccess } from "./shared/storage";
import { AuthProvider, useAuth } from "./shared/auth";
import LoginForm from "./components/auth/LoginForm";
import RegisterForm from "./components/auth/RegisterForm";
import PendingReviewGate from "./admin/components/PendingReviewGate";
import "./styles/home.css";
import "./styles/admin-auth.css";

import veraLogoHome from "./assets/vera_logo.png";

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";
const DEMO_EMAIL = import.meta.env.VITE_DEMO_ADMIN_EMAIL || "";
const DEMO_PASS = import.meta.env.VITE_DEMO_ADMIN_PASSWORD || "";

// Wrapper: wraps the app in AuthProvider
export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}

function AppInner() {
  const auth = useAuth();

  const [page, setPage] = useState(() => {
    try {
      const pathname = window.location.pathname;
      const params = new URLSearchParams(window.location.search);
      const urlToken = params.get("t");
      if (urlToken) return "jury_gate";
      if (pathname === "/jury-entry") {
        if (getJuryAccess()) return "jury";
        return "jury_gate";
      }
      const saved = getPage();
      if (saved === "admin") return "admin";
      if (saved === "jury") {
        if (DEMO_MODE) return "jury";
        if (getJuryAccess()) return "jury";
        return "home";
      }
    } catch { }
    return "home";
  });

  const [entryToken] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get("t") || "";
    } catch { return ""; }
  });

  // Admin auth sub-page: "login" | "register"
  const [adminAuthPage, setAdminAuthPage] = useState("login");
  const [adminAuthError, setAdminAuthError] = useState("");
  const [adminInitialLoading, setAdminInitialLoading] = useState(true);

  useEffect(() => {
    if (page === "jury_gate") return;
    persistPage(page);
  }, [page]);

  useEffect(() => initScrollIndicators(), []);

  // Demo mode: auto-sign-in
  useEffect(() => {
    if (!DEMO_MODE || !DEMO_EMAIL || !DEMO_PASS) return;
    if (page !== "admin" || auth.user) return;
    let active = true;
    auth.signIn(DEMO_EMAIL, DEMO_PASS).catch(() => {
      if (active) setAdminAuthError("Demo auto-login failed.");
    });
    return () => { active = false; };
  }, [page, auth.user, auth]);

  async function handleLogin(email, password) {
    setAdminAuthError("");
    await auth.signIn(email, password);
  }

  async function handleRegister(email, password, metadata) {
    setAdminAuthError("");
    const result = await auth.signUp(email, password, {
      name: metadata.name,
    });

    // After sign-up, submit the tenant application.
    // The user is now authenticated but has no membership yet.
    if (result?.user) {
      try {
        await submitAdminApplication({
          tenantId: metadata.tenantId,
          name: metadata.name,
          university: metadata.university,
          department: metadata.department,
        });
      } catch (err) {
        // Application submission failed, but user is created.
        // They can retry application later.
        const msg = err?.message || "";
        if (msg.includes("application_already_pending")) {
          // Already has a pending application — that's fine
        } else {
          throw new Error("Account created, but application submission failed: " + msg);
        }
      }
    }
  }

  function handleAdminSignOut() {
    auth.signOut();
    setPage("home");
    setAdminAuthError("");
  }

  // ── Jury gate (QR/token verification) ────────────────────
  if (page === "jury_gate") {
    return (
      <ErrorBoundary>
        <div id="main-content">
          <JuryGatePage
            token={entryToken}
            onGranted={() => setPage("jury")}
            onBack={() => setPage("home")}
          />
        </div>
      </ErrorBoundary>
    );
  }

  // ── Jury form ─────────────────────────────────────────────
  if (page === "jury") {
    return (
      <ErrorBoundary>
        <div id="main-content">
          <JuryForm onBack={() => setPage("home")} />
        </div>
      </ErrorBoundary>
    );
  }

  // ── Admin panel ───────────────────────────────────────────
  if (page === "admin") {
    // Still loading auth state
    if (auth.loading) {
      return <MinimalLoaderOverlay open minDuration={400} />;
    }

    // Not authenticated — show login/register
    if (!auth.user) {
      return (
        <div className="premium-screen">
          <div className={`premium-card ${adminAuthPage === "register" ? "premium-card--auth-register" : "premium-card--auth-login"}`}>
            {adminAuthPage === "login" ? (
              <LoginForm
                onLogin={handleLogin}
                onSwitchToRegister={() => setAdminAuthPage("register")}
                error={adminAuthError}
              />
            ) : (
              <RegisterForm
                onRegister={handleRegister}
                onSwitchToLogin={() => setAdminAuthPage("login")}
                error={adminAuthError}
              />
            )}
            <button
              className="admin-auth-home-link"
              onClick={() => { setPage("home"); setAdminAuthError(""); }}
            >
              ← Return Home
            </button>
          </div>
        </div>
      );
    }

    // Authenticated but no approved membership — pending gate
    if (auth.isPending) {
      return (
        <PendingReviewGate
          user={auth.user}
          onSignOut={handleAdminSignOut}
          onBack={() => setPage("home")}
        />
      );
    }

    // Authenticated and approved — show admin panel
    return (
      <ErrorBoundary>
        <div id="main-content">
          {adminInitialLoading && (
            <MinimalLoaderOverlay open={adminInitialLoading} minDuration={400} />
          )}
          <AdminPanel
            isDemoMode={DEMO_MODE}
            onAuthError={() => handleAdminSignOut()}
            onInitialLoadDone={() => setAdminInitialLoading(false)}
            onBack={() => {
              setPage("home");
              setAdminInitialLoading(true);
            }}
            onLogout={handleAdminSignOut}
          />
        </div>
      </ErrorBoundary>
    );
  }

  // ── Home page ─────────────────────────────────────────────
  return (
    <div id="main-content" className="home">
      <div className="home-bg" />
      <div className="home-card">
        <div className="home-logo-wrap">
          <img className="home-logo" src={veraLogoHome} alt="TEDU VERA" loading="eager" />
        </div>

        <p className="home-definition">
          Verdict &amp; Evaluation Ranking Assistant
        </p>
        <p className="home-tagline">
          A smarter way to evaluate and rank capstone projects
        </p>

        <div className="home-buttons">
          <button
            className="btn-primary big home-primary-btn"
            onClick={() => DEMO_MODE ? setPage("jury") : setPage("jury_gate")}
          >
            <span className="home-btn-icon" aria-hidden="true"><ClipboardIcon /></span>
            Start Evaluation
          </button>
          <button className="btn-outline big home-secondary-btn" onClick={() => setPage("admin")}>
            <span className="home-btn-icon" aria-hidden="true"><ShieldUserIcon /></span>
            Admin Panel
          </button>
        </div>

        <div className="home-footer">
          © 2026 · TED University · Developed by{" "}
          <a
            className="home-footer-link"
            href="https://huguryildiz.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Huseyin Ugur Yildiz
          </a>
          {" "}· v1.0
        </div>
      </div>
    </div>
  );
}
