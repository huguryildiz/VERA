// src/auth/PendingReviewScreen.jsx
// Shown when an authenticated user has no active membership yet (pending join request).

import { useEffect, useState } from "react";
import { Clock, LogIn, Info, Building2, MoreVertical } from "lucide-react";
import { getMyJoinRequests } from "@/shared/api";
import { formatDate } from "@/shared/lib/dateUtils";

/* ── Status Stepper ── */
function StatusStepper() {
  return (
    <div className="prv-stepper">
      <div className="prv-step">
        <div className="prv-step-dot prv-dot-done">
          <MoreVertical size={14} strokeWidth={2.5} />
        </div>
        <div className="prv-step-label prv-label-done">Requested</div>
      </div>
      <div className="prv-step-line prv-line-active" />
      <div className="prv-step">
        <div className="prv-step-dot prv-dot-active">
          <MoreVertical size={14} strokeWidth={2.5} />
        </div>
        <div className="prv-step-label prv-label-active">In Review</div>
      </div>
      <div className="prv-step-line" />
      <div className="prv-step">
        <div className="prv-step-dot prv-dot-pending">
          <LogIn size={14} strokeWidth={2.5} />
        </div>
        <div className="prv-step-label">Access</div>
      </div>
    </div>
  );
}

export default function PendingReviewScreen({ user, onSignOut, onBack }) {
  const [joinRequests, setJoinRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getMyJoinRequests()
      .catch(() => [])
      .then((reqs) => { if (active) setJoinRequests(reqs || []); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const hasJoinReqs = joinRequests.length > 0;
  const title = hasJoinReqs ? "Join Request Pending" : "Access Required";

  return (
    <div className="login-screen">
      <div className="prv-wrap">
        <div className="prv-card">
          <div className="prv-header">
            <div className="prv-icon">
              <Clock size={26} strokeWidth={1.5} />
            </div>
            <div className="prv-title">{title}</div>
            <div className="prv-sub">
              Your account <strong>{user?.email}</strong> is not yet approved for admin access.
            </div>
          </div>

          {hasJoinReqs && <StatusStepper />}
          {hasJoinReqs && <div className="prv-divider" />}

          {!loading && (
            <>
              {hasJoinReqs ? (
                <div className="prv-section">
                  <div className="prv-section-label">Join Requests</div>
                  <div className="prv-app-list">
                    {joinRequests.map((req) => (
                      <div key={req.id} className="prv-app-card">
                        <div className="prv-app-icon prv-app-icon-pending">
                          <Building2 size={16} />
                        </div>
                        <div className="prv-app-body">
                          <div className="prv-app-name">
                            {req.organization?.name || "Unknown organization"}
                          </div>
                          {req.created_at && (
                            <div className="prv-app-date">Requested {formatDate(req.created_at)}</div>
                          )}
                        </div>
                        <div className="prv-app-badge prv-badge-pending">
                          <span className="prv-pulse-dot" />
                          Awaiting Approval
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="prv-hint prv-hint-info">
                    <Info size={16} />
                    <p>An administrator of the organization will review your request. You&apos;ll gain access once approved.</p>
                  </div>
                </div>
              ) : (
                <div className="prv-empty">
                  <div className="prv-empty-icon">
                    <Clock size={22} strokeWidth={1.5} />
                  </div>
                  <div className="prv-empty-title">No Active Requests</div>
                  <div className="prv-empty-desc">
                    Contact your organization administrator to get access, or sign in with a different account.
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="prv-footer">
          <button type="button" onClick={onBack} className="prv-link-home">
            &larr; Return Home
          </button>
          <button type="button" onClick={onSignOut} className="prv-btn-signout">
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
