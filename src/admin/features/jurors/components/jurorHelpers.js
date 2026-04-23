import { formatDateTime as formatFull } from "@/shared/lib/dateUtils";

export function formatRelative(ts) {
  if (!ts) return "—";
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 2_592_000_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  if (diff < 31_536_000_000) return `${Math.floor(diff / 2_592_000_000)}mo ago`;
  const yrs = Math.round(diff / 31_536_000_000 * 10) / 10;
  return `${yrs % 1 === 0 ? yrs : yrs.toFixed(1)}yr ago`;
}

export function formatEditWindowLeft(ts, nowMs = Date.now()) {
  if (!ts) return "";
  const expiresMs = Date.parse(ts);
  if (!Number.isFinite(expiresMs)) return "";
  const diff = expiresMs - nowMs;
  if (diff <= 0) return "window expired";
  if (diff < 60_000) return `${Math.ceil(diff / 1000)}s left`;
  const hours = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${mins}m left`;
  return `${Math.max(1, mins)}m left`;
}

export function isEditWindowActive(ts, nowMs = Date.now()) {
  if (!ts) return false;
  const expiresMs = Date.parse(ts);
  return Number.isFinite(expiresMs) && expiresMs > nowMs;
}

export function getLiveOverviewStatus(juror, nowMs = Date.now()) {
  const status = juror?.overviewStatus || "not_started";
  if (status !== "editing") return status;
  return isEditWindowActive(juror?.editExpiresAt || juror?.edit_expires_at, nowMs)
    ? "editing"
    : "completed";
}

export function formatEditWindowText(juror, nowMs) {
  const left = formatEditWindowLeft(juror?.editExpiresAt || juror?.edit_expires_at, nowMs);
  return left ? ` (${left})` : "";
}

export const JUROR_COLUMNS = [
  { key: "name",       label: "Juror Name",         exportWidth: 28 },
  { key: "progress",   label: "Projects Evaluated",  exportWidth: 20 },
  { key: "avgScore",   label: "Avg. Score",          exportWidth: 14 },
  { key: "status",     label: "Status",              exportWidth: 14 },
  { key: "lastActive", label: "Last Active",          exportWidth: 18 },
];

export function getJurorCell(j, key, avgMap) {
  if (key === "name")       return j.juryName || j.juror_name || "";
  if (key === "progress") {
    const scored = j.overviewScoredProjects ?? 0;
    const total  = j.overviewTotalProjects  ?? 0;
    return `${scored} of ${total}`;
  }
  if (key === "avgScore") {
    const jid = String(j.jurorId || j.juror_id || "");
    return avgMap?.get(jid) ?? "—";
  }
  if (key === "status")     return j.overviewStatus || "";
  if (key === "lastActive") {
    const ts = j.lastSeenAt || j.last_activity_at || j.finalSubmittedAt || j.final_submitted_at;
    return formatFull(ts);
  }
  return "";
}

export function groupBarColor(scored, total) {
  if (total === 0) return "var(--text-tertiary)";
  if (scored >= total) return "var(--success)";
  if (scored > 0) return "var(--warning)";
  return "var(--text-tertiary)";
}

export function groupTextClass(scored, total) {
  if (total === 0) return "jurors-table-groups jt-zero";
  if (scored >= total) return "jurors-table-groups jt-done";
  if (scored > 0) return "jurors-table-groups jt-partial";
  return "jurors-table-groups jt-zero";
}

export function mobileScoreStyle(score) {
  if (!score && score !== 0) return { color: "#475569" };
  const n = parseFloat(score);
  if (isNaN(n)) return { color: "#475569" };
  if (n >= 90) return { color: "#34d399" };
  if (n >= 74) return { color: "#60a5fa" };
  if (n >= 60) return { color: "#fb923c" };
  return { color: "#475569" };
}
