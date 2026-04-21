import { UserPlus, MoreVertical, MailOpen, X, AlertCircle } from "lucide-react";
import FbAlert from "../../shared/ui/FbAlert.jsx";
import "./AdminTeamCard.css";

// Deterministic avatar color from string hash
function avatarColor(str) {
  const colors = [
    "#6366f1", // Indigo
    "#8b5cf6", // Violet
    "#0ea5e9", // Cyan
    "#14b8a6", // Teal
    "#f59e0b", // Amber
    "#ec4899", // Pink
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

// Extract initials from name or email
function initials(member) {
  if (member.displayName) {
    const parts = member.displayName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }
  return member.email.slice(0, 2).toUpperCase();
}

// Skeleton loading rows
function SkeletonRows() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <tr key={i} className="admin-team-skeleton-row">
          <td colSpan={4}>
            <div className="admin-team-skeleton-cell" />
          </td>
        </tr>
      ))}
    </>
  );
}

export default function AdminTeamCard({
  members = [],
  loading,
  error,
  inviteForm,
  openInviteForm,
  closeInviteForm,
  setInviteEmail,
  sendInvite,
  resendInvite,
  cancelInvite,
  currentUserId,
}) {
  const active = members.filter((m) => m.status === "active");
  const pending = members.filter((m) => m.status === "invited");

  return (
    <div className="admin-team-card">
      <div className="admin-team-header">
        <div>
          <span className="admin-team-title">Admin Team</span>
          {!loading && (
            <span className="admin-team-meta">
              {active.length > 0 && ` · ${active.length} active`}
              {pending.length > 0 && ` · ${pending.length} pending`}
            </span>
          )}
        </div>
        {!inviteForm?.open && (
          <button type="button" className="btn-invite-admin" onClick={openInviteForm}>
            <UserPlus size={14} strokeWidth={2} />
            Invite Admin
          </button>
        )}
      </div>

      {inviteForm?.open && (
        <div className="admin-team-invite-form">
          <div className="admin-team-invite-label">Invite New Admin</div>
          <div className="admin-team-invite-row">
            <input
              type="email"
              placeholder="email@university.edu"
              value={inviteForm.email}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendInvite()}
              className={inviteForm.error ? "error" : ""}
              disabled={inviteForm.submitting}
              autoFocus
            />
            <button
              type="button"
              className="btn-send-invite"
              onClick={sendInvite}
              disabled={inviteForm.submitting}
            >
              {inviteForm.submitting ? "Sending…" : "Send"}
            </button>
            <button
              type="button"
              className="btn-close-invite"
              onClick={closeInviteForm}
              disabled={inviteForm.submitting}
            >
              <X size={14} strokeWidth={2} />
            </button>
          </div>
          {inviteForm.error && (
            <p className="crt-field-error">
              <AlertCircle size={12} strokeWidth={2} />
              {inviteForm.error}
            </p>
          )}
        </div>
      )}

      {error && <FbAlert variant="danger">{error}</FbAlert>}

      <table className="admin-team-table">
        <tbody>
          {loading ? (
            <SkeletonRows />
          ) : (
            <>
              {active.length > 0 && (
                <>
                  <tr>
                    <td colSpan={4} className="admin-team-section-label">
                      Active ({active.length})
                    </td>
                  </tr>
                  {active.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <div className="admin-team-member-cell">
                          <div
                            className="admin-team-avatar"
                            style={{ background: avatarColor(m.email) }}
                          >
                            {initials(m)}
                          </div>
                          <div>
                            <div className="admin-team-name">
                              {m.displayName || m.email}
                            </div>
                            {m.displayName && (
                              <div className="admin-team-email">{m.email}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="badge-active">● Active</span>
                      </td>
                      <td className="admin-team-actions">
                        <div className="admin-team-actions-wrap">
                          {m.userId === currentUserId ? (
                            <span className="admin-team-you-badge">You</span>
                          ) : (
                            <button
                              type="button"
                              className="btn-kebab"
                              title="More actions"
                            >
                              <MoreVertical size={14} strokeWidth={2} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </>
              )}

              {pending.length > 0 && (
                <>
                  <tr>
                    <td
                      colSpan={4}
                      className="admin-team-section-label admin-team-section-pending"
                    >
                      Pending ({pending.length})
                    </td>
                  </tr>
                  {pending.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <div className="admin-team-member-cell">
                          <div className="admin-team-avatar admin-team-avatar-pending">
                            ?
                          </div>
                          <div>
                            <div className="admin-team-name admin-team-name-pending">
                              {m.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="badge-pending">⏳ Pending</span>
                      </td>
                      <td className="admin-team-actions">
                        {m.userId !== currentUserId && (
                          <>
                            <button
                              type="button"
                              className="btn-resend"
                              onClick={() => resendInvite(m.id, m.email)}
                              title="Resend invite"
                            >
                              <MailOpen size={12} strokeWidth={2} />
                              Resend
                            </button>
                            <button
                              type="button"
                              className="btn-cancel-invite"
                              onClick={() => cancelInvite(m.id)}
                              title="Cancel invite"
                            >
                              <X size={12} strokeWidth={2} />
                              Cancel
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </>
              )}

              {!loading && active.length === 0 && pending.length === 0 && (
                <tr>
                  <td colSpan={4} className="admin-team-empty">
                    No admins yet
                  </td>
                </tr>
              )}
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}
