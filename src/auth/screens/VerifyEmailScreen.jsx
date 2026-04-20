import { useContext, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MailCheck, MailWarning, Loader2 } from "lucide-react";
import FbAlert from "@/shared/ui/FbAlert";
import { confirmEmailVerification } from "@/shared/api";
import { AuthContext } from "@/auth/AuthProvider";

export default function VerifyEmailScreen() {
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const auth = useContext(AuthContext);
  const [state, setState] = useState("pending"); // pending | success | error
  const [errorMsg, setErrorMsg] = useState("");

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
    const id = setTimeout(() => navigate("/admin", { replace: true }), 1800);
    return () => clearTimeout(id);
  }, [state, navigate]);

  return (
    <div className="apply-screen">
      <div className="apply-wrap">
        <div className="apply-card">
          {state === "pending" && (
            <div className="apply-header" role="status" aria-live="polite" aria-atomic="true">
              <div className="apply-icon-wrap"><Loader2 size={24} className="spin" /></div>
              <div className="apply-title">Verifying your email…</div>
              <div className="apply-sub">Just a moment.</div>
            </div>
          )}
          {state === "success" && (
            <div className="apply-header" role="status" aria-live="polite" aria-atomic="true">
              <div className="apply-icon-wrap"><MailCheck size={24} strokeWidth={1.5} /></div>
              <div className="apply-title">Email verified</div>
              <div className="apply-sub">Redirecting you to admin…</div>
            </div>
          )}
          {state === "error" && (
            <>
              <div className="apply-header" role="status" aria-live="polite" aria-atomic="true">
                <div className="apply-icon-wrap"><MailWarning size={24} strokeWidth={1.5} /></div>
                <div className="apply-title">Verification failed</div>
                <div className="apply-sub">We couldn&apos;t verify your email.</div>
              </div>
              <FbAlert variant="danger">{errorMsg}</FbAlert>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function normalize(raw) {
  const m = String(raw || "").toLowerCase();
  if (m.includes("expired")) return "This verification link has expired. Request a new one from the banner.";
  if (m.includes("already_used")) return "This link has already been used.";
  if (m.includes("not_found")) return "This link is invalid.";
  return "Could not verify your email. Please request a new link.";
}
