import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { formatDateTime } from "@/shared/lib/dateUtils";

export default function PendingApplicationsPanel({ applications, onApprove, onReject, loading }) {
  const [outcomes, setOutcomes] = useState({});

  async function handleApprove(applicationId) {
    setOutcomes((prev) => ({ ...prev, [applicationId]: "approved" }));
    await onApprove(applicationId);
  }

  async function handleReject(applicationId) {
    setOutcomes((prev) => ({ ...prev, [applicationId]: "rejected" }));
    await onReject(applicationId);
  }

  if (!applications.length) return null;

  return (
    <div data-testid="org-pending-list" style={{ marginBottom: 24, padding: "12px 16px", border: "1px solid color-mix(in srgb, var(--warning) 35%, transparent)", borderRadius: "var(--radius)", background: "color-mix(in srgb, var(--warning) 6%, transparent)" }}>
      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10, color: "var(--warning)" }}>
        Pending Applications ({applications.length})
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {applications.map((app) => {
          const outcome = outcomes[app.applicationId];
          return (
            <div key={app.applicationId} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "8px 10px", background: "var(--surface)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{app.orgName}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{app.name} · {app.email}</div>
                {app.createdAt && (
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{formatDateTime(app.createdAt)}</div>
                )}
              </div>
              {outcome === "approved" && (
                <span data-testid="org-approved-badge" style={{ fontSize: 12, fontWeight: 600, color: "var(--success)", display: "flex", alignItems: "center", gap: 4 }}>
                  <CheckCircle2 size={13} strokeWidth={2} />
                  Approved
                </span>
              )}
              {outcome === "rejected" && (
                <span data-testid="org-rejected-badge" style={{ fontSize: 12, fontWeight: 600, color: "var(--danger)", display: "flex", alignItems: "center", gap: 4 }}>
                  <XCircle size={13} strokeWidth={2} />
                  Rejected
                </span>
              )}
              {!outcome && (
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    type="button"
                    data-testid={`org-approve-btn-${app.applicationId}`}
                    disabled={loading}
                    onClick={() => handleApprove(app.applicationId)}
                    style={{ padding: "4px 10px", borderRadius: "var(--radius-sm)", border: "1px solid color-mix(in srgb, var(--success) 40%, transparent)", background: "color-mix(in srgb, var(--success) 12%, transparent)", color: "var(--success)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    data-testid={`org-reject-btn-${app.applicationId}`}
                    disabled={loading}
                    onClick={() => handleReject(app.applicationId)}
                    style={{ padding: "4px 10px", borderRadius: "var(--radius-sm)", border: "1px solid color-mix(in srgb, var(--danger) 25%, transparent)", background: "color-mix(in srgb, var(--danger) 8%, transparent)", color: "var(--danger)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
