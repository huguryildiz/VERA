// src/admin/components/AuditEventDrawer.jsx
// Sticky inline aside panel — opens when a feed event is clicked.
// NOT a full-screen overlay drawer.

import { X, Clipboard, Check } from "lucide-react";
import { useState } from "react";
import { getActorInfo, formatActionLabel, formatAuditTimestamp } from "../utils/auditUtils";

export default function AuditEventDrawer({ log, onClose }) {
  const [copied, setCopied] = useState(false);

  if (!log) return null;

  const actor = getActorInfo(log);
  const ts = formatAuditTimestamp(log.created_at);
  const rawJson = JSON.stringify(log.details || {}, null, 2);

  function handleCopy() {
    navigator.clipboard?.writeText(rawJson).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  return (
    <aside className="audit-event-drawer-panel">
      <div className="audit-drawer-head">
        <div>
          <div className="audit-drawer-title">{formatActionLabel(log.action)}</div>
          <div className="audit-drawer-sub">{ts}</div>
        </div>
        <button className="audit-drawer-close" type="button" aria-label="Close" onClick={onClose}>
          <X size={13} />
        </button>
      </div>

      <div className="audit-drawer-row">
        <div className="audit-drawer-key">Actor</div>
        <div className="audit-drawer-value">
          {actor.name}
          {actor.role && <span style={{ color: "var(--text-tertiary)", marginLeft: 4 }}>· {actor.role}</span>}
        </div>
      </div>
      <div className="audit-drawer-row">
        <div className="audit-drawer-key">Action</div>
        <div className="audit-drawer-value" style={{ fontFamily: "ui-monospace, monospace", fontSize: 11 }}>{log.action || "—"}</div>
      </div>
      <div className="audit-drawer-row">
        <div className="audit-drawer-key">Resource</div>
        <div className="audit-drawer-value">
          {log.resource_type || "—"}
          {log.resource_id && (
            <span style={{ color: "var(--text-tertiary)", marginLeft: 4, fontFamily: "ui-monospace, monospace", fontSize: 10.5 }}>
              #{String(log.resource_id).slice(0, 8)}…
            </span>
          )}
        </div>
      </div>
      {log.organization_id && (
        <div className="audit-drawer-row">
          <div className="audit-drawer-key">Org ID</div>
          <div className="audit-drawer-value" style={{ fontFamily: "ui-monospace, monospace", fontSize: 10.5 }}>
            {String(log.organization_id).slice(0, 8)}…
          </div>
        </div>
      )}

      <div className="audit-drawer-section-label">Raw details</div>
      <div className="audit-drawer-code">{rawJson}</div>

      <div className="audit-drawer-actions">
        <button className="btn btn-outline btn-sm" type="button" onClick={handleCopy}>
          {copied ? <Check size={12} /> : <Clipboard size={12} />}
          {copied ? "Copied" : "Copy JSON"}
        </button>
      </div>
    </aside>
  );
}
