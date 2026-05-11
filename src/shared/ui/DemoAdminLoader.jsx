// src/components/DemoAdminLoader.jsx
// Auto-login overlay for demo "Explore Admin Panel" flow.
// Runs real Supabase signIn in parallel with a 3-step animation.
// Also pre-warms the admin panel's first-render data while the animation
// runs, so /demo/admin renders with data already hydrated (see __VERA_PRELOAD
// consumers in useAdminData.js and AdminRouteLayout.jsx).
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/auth";
import {
  supabase,
  listPeriods,
  getScores,
  getProjectSummary,
  listJurorsSummary,
  getJurorSummary,
  getPeriodSummary,
  listPeriodCriteria,
  listPeriodOutcomes,
  listFrameworks,
} from "@/shared/api";
import { pickDefaultPeriod } from "@/jury/shared/periodSelection";

import { Icon } from "lucide-react";

const DEMO_EMAIL = import.meta.env.VITE_DEMO_ADMIN_EMAIL;
const DEMO_PASSWORD = import.meta.env.VITE_DEMO_ADMIN_PASSWORD;

const STEPS = [
  {
    label: "Authenticating",
    desc: "Verifying demo credentials",
    icon: (
      <Icon
        iconNode={[]}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2">
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </Icon>
    ),
  },
  {
    label: "Loading organizations",
    desc: null,
    icon: (
      <Icon
        iconNode={[]}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </Icon>
    ),
  },
  {
    label: "Syncing evaluation data",
    desc: null,
    icon: (
      <Icon
        iconNode={[]}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </Icon>
    ),
  },
];

async function fetchDemoStats() {
  const queries = Promise.all([
    supabase.from("organizations").select("*", { count: "estimated", head: true }),
    supabase.from("projects").select("*", { count: "estimated", head: true }),
    supabase.from("jurors").select("*", { count: "estimated", head: true }),
    supabase.from("periods").select("*", { count: "estimated", head: true }),
  ]);
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("timeout")), 7000),
  );
  const [orgsRes, projectsRes, jurorsRes, periodsRes] = await Promise.race([queries, timeout]);
  return {
    orgs: orgsRes.error ? null : orgsRes.count,
    projects: projectsRes.error ? null : projectsRes.count,
    jurors: jurorsRes.error ? null : jurorsRes.count,
    periods: periodsRes.error ? null : periodsRes.count,
  };
}

// Pre-warm: while the loader animation runs, fetch the data the admin panel
// needs on first render and stash it in window.__VERA_PRELOAD. The hooks in
// useAdminData and AdminRouteLayout's criteria effect read this on mount,
// hydrate their initial state, and skip their first-fetch round-trips.
// One-shot: criteria effect deletes the global after consuming.
async function preWarmAdminData(orgId) {
  try {
    let periods;
    let targetId;
    const fromBootstrap = typeof window !== "undefined" ? window.__VERA_BOOTSTRAP_PREFERRED : null;
    if (fromBootstrap && fromBootstrap.orgId === orgId) {
      periods = fromBootstrap.periods;
      targetId = fromBootstrap.defaultPeriodId || periods?.[0]?.id || null;
      delete window.__VERA_BOOTSTRAP_PREFERRED;
    } else {
      periods = await listPeriods(orgId);
      targetId = pickDefaultPeriod(periods)?.id || periods?.[0]?.id || null;
    }
    if (!targetId) {
      window.__VERA_PRELOAD = { orgId, periods: periods || [], targetId: null, expiresAt: Date.now() + 30000 };
      return;
    }
    const [scores, projectSummary, jurors, jurorSummary, periodSummary, criteriaRows, outcomeRows, frameworks] = await Promise.all([
      getScores(targetId).catch(() => []),
      getProjectSummary(targetId).catch(() => []),
      listJurorsSummary(targetId).catch(() => []),
      getJurorSummary(targetId).catch(() => []),
      getPeriodSummary(targetId).catch(() => null),
      listPeriodCriteria(targetId).catch(() => []),
      listPeriodOutcomes(targetId).catch(() => []),
      listFrameworks(orgId).catch(() => []),
    ]);
    window.__VERA_PRELOAD = {
      orgId, targetId, periods,
      scores, projectSummary, jurors, jurorSummary, periodSummary,
      criteriaRows, outcomeRows, frameworks,
      expiresAt: Date.now() + 30000,
    };
  } catch {
    // Silent — admin panel will fall back to its normal fetch path.
  }
}

// step state: "" | "active" | "done"
export default function DemoAdminLoader({ onComplete }) {
  const { signIn, activeOrganization } = useAuth();
  const stepsRef = useRef([]);
  const descRefs = useRef([]);
  const barRef = useRef(null);
  const didRun = useRef(false);
  const preWarmRef = useRef(null);
  const [authFailed, setAuthFailed] = useState(false);

  // Fire pre-warm as soon as AuthProvider resolves the demo organization
  // (which happens shortly after signIn → memberships fetch). Runs in
  // parallel with the loader animation so its cost is largely hidden.
  useEffect(() => {
    if (!activeOrganization?.id || preWarmRef.current) return;
    preWarmRef.current = preWarmAdminData(activeOrganization.id);
  }, [activeOrganization]);

  const run = useCallback(async () => {
    if (didRun.current) return;
    didRun.current = true;
    setAuthFailed(false);

    const delay = (ms) => new Promise((r) => setTimeout(r, ms));

    const setStep = (i, cls) => {
      const el = stepsRef.current[i];
      if (!el) return;
      el.className = "dao-step" + (cls ? " " + cls : "");
    };
    const setBar = (pct) => {
      if (barRef.current) barRef.current.style.width = pct + "%";
    };
    const setDesc = (i, text) => {
      const el = descRefs.current[i];
      if (!el) return;
      if (text) {
        el.textContent = text;
        el.style.display = "";
      } else {
        el.style.display = "none";
      }
    };

    const PAUSE_AFTER_DATA = 120; // ms to show the data before turning green

    // Step 0: active → auth resolves → green
    setStep(0, "active"); setBar(15);
    const authOk = await signIn(DEMO_EMAIL, DEMO_PASSWORD, true).then(() => true, () => false);
    await delay(PAUSE_AFTER_DATA);
    setStep(0, authOk ? "done" : "error"); setBar(authOk ? 35 : 15);

    if (!authOk) {
      setAuthFailed(true);
      return;
    }

    // Step 1: active → stats arrive (auth is ready now) → desc written → green
    setStep(1, "active"); setBar(50);
    const stats = await fetchDemoStats().catch(() => null);
    if (stats?.orgs > 0) setDesc(1, `${stats.orgs} organization${stats.orgs !== 1 ? "s" : ""}`);
    await delay(PAUSE_AFTER_DATA);
    setStep(1, "done"); setBar(70);

    // Step 2: active → desc written (stats already ready) → green
    setStep(2, "active"); setBar(85);
    if (stats) {
      const parts = [];
      if (stats.projects > 0) parts.push(`${stats.projects} projects`);
      if (stats.jurors > 0) parts.push(`${stats.jurors} jurors`);
      if (stats.periods > 0) parts.push(`${stats.periods} period${stats.periods !== 1 ? "s" : ""}`);
      if (parts.length > 0) setDesc(2, parts.join(" · "));
    }
    await delay(PAUSE_AFTER_DATA);
    setStep(2, "done"); setBar(100);

    // Don't redirect until pre-warm finishes (with a soft cap so we never
    // block the redirect for more than 2.5s if the network is unusually slow).
    if (preWarmRef.current) {
      await Promise.race([preWarmRef.current, delay(2500)]);
    }

    await delay(150);
    if (onComplete) onComplete();
    else window.location.replace("/demo/admin");
  }, [signIn, onComplete]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { run(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRetry = useCallback(() => {
    // Reset steps visually
    stepsRef.current.forEach((el) => { if (el) el.className = "dao-step"; });
    if (barRef.current) barRef.current.style.width = "0%";
    didRun.current = false;
    run();
  }, [run]);

  return (
    <div className="demo-admin-overlay active" data-testid="demo-admin-shell">
      <div className="dao-content">
        <div className="dao-logo">
          <Icon
            iconNode={[]}
            className="dao-logo-gear"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </Icon>
        </div>
        <div className="dao-title">Preparing your workspace</div>
        <div className="dao-steps">
          {STEPS.map((s, i) => (
            <div key={i} className="dao-step" ref={(el) => (stepsRef.current[i] = el)}>
              <div className="dao-step-icon">{s.icon}</div>
              <div className="dao-step-text">
                <div className="dao-step-label">
                  {s.label}
                  <span className="dao-dots" aria-hidden="true">
                    <span /><span /><span />
                  </span>
                </div>
                <div
                  className="dao-step-desc"
                  ref={(el) => (descRefs.current[i] = el)}
                  style={s.desc === null ? { display: "none" } : undefined}
                >
                  {s.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="dao-progress">
          <div className="dao-progress-bar" ref={barRef} />
        </div>
        {authFailed && (
          <div style={{
            marginTop: "20px",
            padding: "12px 16px",
            borderRadius: "8px",
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.25)",
            color: "var(--danger, #ef4444)",
            fontSize: "13px",
            textAlign: "center",
          }}>
            <div style={{ fontWeight: 600, marginBottom: "8px" }}>Failed to connect to demo</div>
            <div style={{ opacity: 0.8, marginBottom: "12px" }}>
              Authentication failed. This may be a temporary issue.
            </div>
            <button
              type="button"
              onClick={handleRetry}
              style={{
                padding: "6px 18px",
                borderRadius: "6px",
                border: "1px solid rgba(239,68,68,0.4)",
                background: "rgba(239,68,68,0.15)",
                color: "var(--danger, #ef4444)",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
