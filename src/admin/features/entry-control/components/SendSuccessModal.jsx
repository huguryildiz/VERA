import { Check } from "lucide-react";
import Modal from "@/shared/ui/Modal";

export default function SendSuccessModal({ open, onClose, sendSummary, periodName }) {
  return (
    <Modal open={open} onClose={onClose} size="sm" centered>
      <div className="fs-modal-header" style={{ borderBottom: "none", paddingBottom: 0 }}>
        <div className="ec-send-success">
          <div className="ec-send-success-icon">
            <Check size={18} strokeWidth={2.5} />
          </div>
          <div className="ec-send-success-title">QR link sent to {sendSummary.delivered} jurors</div>
          <div className="ec-send-success-desc">
            {sendSummary.delivered > 0
              ? `Access link for ${periodName || "this period"} was delivered to ${sendSummary.delivered} juror${sendSummary.delivered === 1 ? "" : "s"}.`
              : `No emails were delivered for ${periodName || "this period"}.`}
            {sendSummary.skipped > 0 ? ` ${sendSummary.skipped} juror${sendSummary.skipped === 1 ? "" : "s"} skipped — no email on file.` : ""}
            {sendSummary.failed > 0 ? ` ${sendSummary.failed} email${sendSummary.failed === 1 ? "" : "s"} could not be delivered.` : ""}
          </div>
        </div>
      </div>
      <div className="fs-modal-body" style={{ paddingTop: 6 }}>
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          <div style={{ padding: "8px 14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--surface-1)", textAlign: "center", flex: 1 }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 16, fontWeight: 800, color: "var(--success)" }}>{sendSummary.delivered}</div>
            <div style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.3px", color: "var(--text-tertiary)", marginTop: 2 }}>Delivered</div>
          </div>
          {sendSummary.skipped > 0 && (
            <div style={{ padding: "8px 14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--surface-1)", textAlign: "center", flex: 1 }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 16, fontWeight: 800, color: "var(--warning)" }}>{sendSummary.skipped}</div>
              <div style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.3px", color: "var(--text-tertiary)", marginTop: 2 }}>No Email</div>
            </div>
          )}
          {sendSummary.failed > 0 && (
            <div style={{ padding: "8px 14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--surface-1)", textAlign: "center", flex: 1 }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 16, fontWeight: 800, color: "var(--danger)" }}>{sendSummary.failed}</div>
              <div style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.3px", color: "var(--text-tertiary)", marginTop: 2 }}>Failed</div>
            </div>
          )}
        </div>
      </div>
      <div className="fs-modal-footer" style={{ justifyContent: "center", background: "transparent", borderTop: "none", paddingTop: 2 }}>
        <button className="fs-btn fs-btn-secondary" onClick={onClose} style={{ minWidth: 120 }}>Done</button>
      </div>
    </Modal>
  );
}
