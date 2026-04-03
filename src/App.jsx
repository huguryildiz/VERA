// src/App.jsx
import { lazy, Suspense, useEffect, useState } from "react";
import { AuthProvider } from "./shared/auth";
import AdminLayout from "./admin/layout/AdminLayout";
import JuryFlow from "./jury/JuryFlow";
import ErrorBoundary from "./shared/ErrorBoundary";
import { getPage, setPage as savePage, getJuryAccess } from "./shared/storage";

const LandingPage = lazy(() => import("./pages/LandingPage").then(m => ({ default: m.LandingPage })));
const JuryGatePage = lazy(() => import("./jury/JuryGatePage"));

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";
const DEMO_ENTRY_TOKEN = import.meta.env.VITE_DEMO_ENTRY_TOKEN;

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}

function AppInner() {
  const [page, setPage] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("t")) return "jury_gate";
      if (params.get("page") === "admin") return "admin";
      const hash = new URLSearchParams((window.location.hash || "").replace(/^#/, ""));
      const isRecovery =
        hash.get("type") === "recovery" ||
        params.get("type") === "recovery" ||
        params.get("page") === "reset-password";
      if (isRecovery) return "admin";
      if (getJuryAccess()) return "jury";
      const saved = getPage();
      if (saved === "jury" || saved === "admin") return saved;
    } catch {}
    return "home";
  });

  // Read entry token once from URL (stable for the component lifetime)
  const token = (() => {
    try {
      return new URLSearchParams(window.location.search).get("t") || (DEMO_MODE ? DEMO_ENTRY_TOKEN : null);
    } catch { return null; }
  })();

  useEffect(() => {
    if (page === "jury_gate") return;
    savePage(page);
  }, [page]);

  if (page === "jury_gate") {
    return (
      <ErrorBoundary>
        <Suspense fallback={null}>
          <JuryGatePage
            token={token}
            onGranted={() => setPage("jury")}
            onBack={() => setPage("home")}
          />
        </Suspense>
      </ErrorBoundary>
    );
  }

  if (page === "jury") {
    return (
      <ErrorBoundary>
        <JuryFlow onBack={() => setPage("home")} />
      </ErrorBoundary>
    );
  }

  if (page === "admin") return <AdminLayout />;

  return (
    <Suspense fallback={null}>
      <LandingPage
        onStartJury={() => setPage(DEMO_MODE ? "jury_gate" : "jury")}
        onAdmin={() => setPage("admin")}
        onSignIn={() => setPage("admin")}
        isDemoMode={DEMO_MODE}
      />
    </Suspense>
  );
}
