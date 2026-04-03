// src/App.jsx — Phase 1: Admin shell wired
// Routing logic preserved. Page components rebuilt per phase (1–14).
// Pages: "home" | "jury_gate" | "jury" | "admin"
import { useEffect, useState } from "react";
import { AuthProvider } from "./shared/auth";
import AdminLayout from "./admin/layout/AdminLayout";

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
    } catch {}
    return "home";
  });

  useEffect(() => {
    if (page === "jury_gate") return;
    try { sessionStorage.setItem("vera_page", page); } catch {}
  }, [page]);

  if (page === "jury_gate") return <div id="main-content" />;
  if (page === "jury") return <div id="main-content" />;
  if (page === "admin") return <AdminLayout />;
  return <div id="main-content" />;
}
