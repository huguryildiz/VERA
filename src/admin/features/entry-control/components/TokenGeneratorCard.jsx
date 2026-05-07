import {
  Check,
  ChevronDown,
  Download,
  Link,
  QrCode,
  RefreshCw,
  Send,
  XCircle,
} from "lucide-react";
import PremiumTooltip from "@/shared/ui/PremiumTooltip";
import { formatDateTime as fmtDate } from "@/shared/lib/dateUtils";

export default function TokenGeneratorCard({
  qrRef,
  status,
  rawToken,
  hasToken,
  isActive,
  expirySoon,
  periodName,
  periodId,
  activeSessions,
  isBusy,
  regenerating,
  copied,
  showTokenDetail,
  setShowTokenDetail,
  entryUrl,
  entryUrlLabel,
  recipientsCount,
  lastBulkSend,
  testSending,
  latestToken,
  hasTokenHistory,
  graceLockTooltip,
  isGraceLocked,
  onGenerateClick,
  onCopy,
  onDownload,
  onOpenSendModal,
  onOpenRevoke,
  onSendTest,
}) {
  return (
    <div className="ec-qr-card">
      <div className="ec-qr-status">
        {hasToken && isActive ? (
          <span className="badge badge-success">
            <Check className="badge-ico" />
            Active
          </span>
        ) : latestToken?.is_expired ? (
          <span className="badge badge-warning">Expired</span>
        ) : hasTokenHistory ? (
          <span className="badge badge-danger">Revoked</span>
        ) : (
          <span className="badge badge-neutral">No Token</span>
        )}
      </div>

      {/* QR Frame */}
      <div className="ec-qr-frame">
        {rawToken ? (
          <div ref={qrRef} style={{ display: "flex", justifyContent: "center" }} />
        ) : (
          <svg viewBox="0 0 148 148" xmlns="http://www.w3.org/2000/svg">
            <rect width="148" height="148" fill="none" />
            <rect x="10" y="10" width="36" height="36" rx="4" fill="var(--text-primary)" opacity="0.85" />
            <rect x="14" y="14" width="28" height="28" rx="2" fill="var(--bg-card)" />
            <rect x="20" y="20" width="16" height="16" rx="1" fill="var(--text-primary)" opacity="0.85" />
            <rect x="102" y="10" width="36" height="36" rx="4" fill="var(--text-primary)" opacity="0.85" />
            <rect x="106" y="14" width="28" height="28" rx="2" fill="var(--bg-card)" />
            <rect x="112" y="20" width="16" height="16" rx="1" fill="var(--text-primary)" opacity="0.85" />
            <rect x="10" y="102" width="36" height="36" rx="4" fill="var(--text-primary)" opacity="0.85" />
            <rect x="14" y="106" width="28" height="28" rx="2" fill="var(--bg-card)" />
            <rect x="20" y="112" width="16" height="16" rx="1" fill="var(--text-primary)" opacity="0.85" />
            <g fill="var(--text-primary)" opacity="0.3">
              <rect x="54" y="54" width="40" height="40" rx="4" />
            </g>
          </svg>
        )}
      </div>

      <div className="ec-qr-label">
        {hasToken && isActive ? "Active Access QR" : "No Active QR"}
      </div>
      <div className="ec-qr-hint">
        Jurors scan this code to join the current evaluation flow. Print or display it at the poster session.
      </div>

      {status && (
        <div className="ec-qr-meta">
          <div className="ec-meta-row">
            <span className="ec-meta-row-label">Period</span>
            <span className="ec-meta-row-value">{periodName || periodId}</span>
          </div>
          {status.created_at && (
            <div className="ec-meta-row">
              <span className="ec-meta-row-label">Created</span>
              <span className="ec-meta-row-value vera-datetime-text">{fmtDate(status.created_at)}</span>
            </div>
          )}
          {status.expires_at && (
            <div className="ec-meta-row">
              <span className="ec-meta-row-label">Expires</span>
              <span className="ec-meta-row-value vera-datetime-text" style={expirySoon ? { color: "var(--danger)" } : {}}>
                {fmtDate(status.expires_at)}
              </span>
            </div>
          )}
          <div className="ec-meta-row">
            <span className="ec-meta-row-label">Active sessions</span>
            <span className="ec-meta-row-value">{activeSessions}</span>
          </div>
        </div>
      )}

      {/* Action toolbar */}
      <div className="ec-qr-actions">
        {rawToken && (
          <button className="btn btn-primary btn-sm ec-download-btn" onClick={onDownload} disabled={isBusy} data-testid="entry-tokens-download-btn">
            <Download size={12} />
            Download QR
          </button>
        )}
        {rawToken && (
          <button className="btn btn-outline btn-sm" onClick={onCopy} disabled={isBusy} data-testid="entry-tokens-copy-btn">
            <Link size={12} />
            {copied ? "Copied!" : "Copy Link"}
          </button>
        )}
        <PremiumTooltip text={graceLockTooltip}>
          <button className="btn btn-outline btn-sm" onClick={onGenerateClick} disabled={isBusy || isGraceLocked} data-testid="entry-tokens-generate-btn">
            <RefreshCw size={12} className={regenerating ? "ec-spin" : ""} />
            {regenerating ? "Generating…" : (hasToken ? "Regenerate" : "Generate QR")}
          </button>
        </PremiumTooltip>
        {hasToken && isActive && (
          <button className="btn btn-outline btn-sm btn-revoke" onClick={onOpenRevoke} disabled={isBusy} data-testid="entry-tokens-revoke-btn">
            <XCircle size={12} />
            Revoke
          </button>
        )}
      </div>

      {/* Bulk distribute panel */}
      {rawToken && isActive && (
        <div className="ec-distribute" id="ec-distribute-panel">
          <div className="ec-distribute-header">
            <div className="ec-distribute-icon">
              <Send size={18} />
            </div>
            <div>
              <div className="ec-distribute-title">Distribute to Jurors</div>
              <div className="ec-distribute-subtitle">
                Send the access link to all {recipientsCount} jurors assigned to {periodName || "this period"}
              </div>
            </div>
          </div>
          <div className="ec-distribute-body">
            <button className="ec-distribute-btn" onClick={onOpenSendModal}>
              <Send size={16} />
              Send QR to All Jurors
            </button>
            <div className="ec-distribute-actions">
              <button className="ec-distribute-link" onClick={onOpenSendModal}>Preview recipients</button>
              <button className="ec-distribute-link" onClick={onSendTest} disabled={testSending}>
                {testSending ? "Sending..." : "Send test"}
              </button>
            </div>
          </div>
          <div className="ec-distribute-meta" id="ec-last-sent">
            <div className="ec-sent-badge">
              <Check size={14} />
              Sent
            </div>
            {lastBulkSend
              ? `Last bulk send: ${fmtDate(lastBulkSend.sentAt)} — ${lastBulkSend.delivered} of ${lastBulkSend.totalAssigned} delivered, ${lastBulkSend.noEmail} without email`
              : "No bulk send yet for this period."}
          </div>
        </div>
      )}

      {/* Token detail disclosure */}
      {rawToken && hasToken && isActive && (
        <div className="ec-token-detail">
          <button
            className={`ec-token-toggle${showTokenDetail ? " open" : ""}`}
            onClick={() => setShowTokenDetail((v) => !v)}
          >
            Token details
            <ChevronDown size={16} />
          </button>
          {showTokenDetail && (
            <div className="ec-token-row show">
              <span className="mono text-sm" title={entryUrl}>{entryUrlLabel}</span>
              <button className="ec-token-copy" onClick={onCopy}>
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
