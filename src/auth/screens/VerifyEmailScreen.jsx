import { useContext, useEffect, useState } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { MailCheck, MailWarning, Loader2, Mail, Info, RefreshCw, LogIn } from "lucide-react";
import { confirmEmailVerification, sendEmailVerification } from "@/shared/api";
import { AuthContext } from "@/auth/AuthProvider";
import FbAlert from "@/shared/ui/FbAlert";

export default function VerifyEmailScreen() {
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useContext(AuthContext);
  const [state, setState] = useState("pending"); // pending | success | error
  const [errorMsg, setErrorMsg] = useState("");
  const [resendState, setResendState] = useState("idle"); // idle | sending | sent | error

  const isDemo = location.pathname.startsWith("/demo");
  const dashPath = isDemo ? "/demo/admin" : "/admin";

  useEffect(() => {
    const token = search.get("token");
    if (!token) { setState("error"); setErrorMsg("Missing token."); return; }
    confirmEmailVerification(token)
      .then(() => {
        setState("success");
        auth?.refreshEmailVerified?.();
      })
      .catch((e) => {
        setState("error");
        setErrorMsg(normalize(e?.message));
      });
  }, [search, auth]);

  useEffect(() => {
    if (state !== "success") return;
    const id = setTimeout(() => navigate(dashPath, { replace: true }), 2000);
    return () => clearTimeout(id);
  }, [state, navigate, dashPath]);

  async function onResend() {
    setResendState("sending");
    try {
      await sendEmailVerification();
      setResendState("sent");
    } catch (e) {
      setResendState("error");
      setErrorMsg(String(e?.message || "Failed to send. Try again."));
    }
  }

  return (
    <div className="vef-screen">
      <div className={`vef-ambient-glow vef-ambient-glow--${state}`} aria-hidden />

      <div className="vef-logo">
        <div className="vef-logo-diamond" aria-hidden />
        <span className="vef-logo-text">VERA</span>
      </div>

      <div className="vef-hero" aria-hidden>
        <div className={`vef-ring vef-ring--3 vef-ring--${state}`} />
        <div className={`vef-ring vef-ring--2 vef-ring--${state}`} />
        <div className={`vef-ring vef-ring--1 vef-ring--${state}`} />
        <div className={`vef-icon-circle vef-icon-circle--${state}`}>
          {state === "pending" && <Loader2 size={32} strokeWidth={2} className="vef-spin" />}
          {state === "success" && <MailCheck size={32} strokeWidth={1.8} />}
          {state === "error"   && <MailWarning size={32} strokeWidth={1.8} />}
        </div>
      </div>

      <div className="vef-body" role="status" aria-live="polite">
        {state === "pending" && (
          <>
            <div className="vef-title">Verifying your email</div>
            <div className="vef-sub">Just a moment — we&apos;re confirming your address.</div>
          </>
        )}
        {state === "success" && (
          <>
            <div className="vef-title vef-title--success">Email verified</div>
            <div className="vef-sub">Your address is confirmed. Full access is now unlocked.</div>
          </>
        )}
        {state === "error" && (
          <>
            <div className="vef-title vef-title--error">Verification failed</div>
            <div className="vef-sub">We couldn&apos;t verify your email address.</div>
          </>
        )}
      </div>

      <div className="vef-info-card">
        {state === "pending" && (
          <>
            <div className="vef-dots" aria-hidden>
              <span /><span /><span />
            </div>
            <div className="vef-info-hint">
              <Info size={14} strokeWidth={2} />
              <p>
                This link is <strong>single-use</strong> and expires 24 hours after it was
                sent. If verification fails, request a new link from the banner inside your
                dashboard.
              </p>
            </div>
          </>
        )}

        {state === "success" && (
          <>
            {auth?.user?.email && (
              <div className="vef-email-row">
                <Mail size={13} strokeWidth={2} />
                <span>{auth.user.email}</span>
              </div>
            )}
            <div className="vef-redirect-hint">
              <span className="vef-redirect-dot" aria-hidden />
              Redirecting to dashboard…
            </div>
          </>
        )}

        {state === "error" && (
          <>
            <FbAlert variant="danger">{errorMsg}</FbAlert>

            {resendState === "sent" ? (
              <div className="vef-sent-msg">
                <Mail size={13} strokeWidth={2} />
                Verification link sent — check your inbox.
              </div>
            ) : (
              <button
                type="button"
                className="apply-submit vef-resend-btn"
                onClick={onResend}
                disabled={resendState === "sending"}
              >
                <RefreshCw size={13} strokeWidth={2.2} className={resendState === "sending" ? "vef-spin" : ""} />
                {resendState === "sending" ? "Sending…" : "Resend verification link"}
              </button>
            )}

            {resendState === "error" && (
              <FbAlert variant="danger" style={{ marginTop: 8 }}>{errorMsg}</FbAlert>
            )}

            <button
              type="button"
              className="vef-btn-ghost"
              onClick={() => navigate(dashPath)}
            >
              <LogIn size={13} strokeWidth={2} />
              Back to dashboard
            </button>
          </>
        )}
      </div>

      <div className="vef-watermark" aria-hidden>VERA</div>
    </div>
  );
}

function normalize(raw) {
  const m = String(raw || "").toLowerCase();
  if (m.includes("expired"))      return "This verification link has expired. Request a new one from the banner in your dashboard.";
  if (m.includes("already_used")) return "This link has already been used.";
  if (m.includes("not_found"))    return "This link is invalid or has already expired.";
  return "Could not verify your email. Please request a new link.";
}
