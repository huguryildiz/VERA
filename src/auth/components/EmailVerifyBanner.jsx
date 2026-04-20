import { useContext, useState } from "react";
import { MailWarning } from "lucide-react";
import { AuthContext } from "@/auth/AuthProvider";
import { sendEmailVerification } from "@/shared/api";

export default function EmailVerifyBanner() {
  const auth = useContext(AuthContext);
  const [state, setState] = useState("idle"); // idle | sending | sent | error
  const [errorMsg, setErrorMsg] = useState("");

  if (!auth?.user || auth.emailVerified) return null;

  async function onResend() {
    setState("sending");
    setErrorMsg("");
    try {
      await sendEmailVerification();
      setState("sent");
    } catch (e) {
      setState("error");
      setErrorMsg(String(e?.message || "Failed to send. Try again."));
    }
  }

  return (
    <div className="evb-wrap" role="status" aria-live="polite">
      <MailWarning size={16} strokeWidth={2} className="evb-icon" />
      <div className="evb-body">
        Verify your email — unverified accounts are automatically deleted after 7 days.
      </div>
      <div className="evb-action">
        {state === "sent" ? (
          <span className="evb-sent">Link sent — check your inbox.</span>
        ) : (
          <button
            type="button"
            className="evb-btn"
            onClick={onResend}
            disabled={state === "sending"}
          >
            {state === "sending" ? "Sending…" : "Resend link"}
          </button>
        )}
        {state === "error" && <span className="evb-error">{errorMsg}</span>}
      </div>
    </div>
  );
}
