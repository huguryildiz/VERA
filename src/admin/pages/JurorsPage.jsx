// src/admin/pages/JurorsPage.jsx — Phase 7
// Jurors management page. Structure from prototype lines 13492–13989.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "../../components/toast/useToast";
import { useManagePeriods } from "../hooks/useManagePeriods";
import { useManageProjects } from "../hooks/useManageProjects";
import { useManageJurors } from "../hooks/useManageJurors";
import "../../styles/pages/jurors.css";

// ── Helpers ──────────────────────────────────────────────────

const AVATAR_COLORS = [
  "#2563eb", "#6366f1", "#0891b2", "#7c3aed", "#0d9488",
  "#4f46e5", "#0284c7", "#7e22ce", "#0369a1", "#64748b",
];

function initials(name) {
  const parts = (name || "").replace(/\b(Prof|Doç|Dr|Ö\.Ü|Müh|Y\.Doç)\b\.?/gi, "").trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0]?.toUpperCase() || "?";
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function avatarColor(name) {
  let hash = 0;
  for (let i = 0; i < (name || "").length; i++) hash = (hash * 31 + (name || "").charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function formatRelative(ts) {
  if (!ts) return "—";
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
  return `${Math.floor(diff / 86400_000)}d ago`;
}

function formatFull(ts) {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleString("en-GB", {
      month: "short", day: "numeric", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return ""; }
}

function statusPillClass(status) {
  switch (status) {
    case "editing": return "pill pill-editing";
    case "completed": return "pill pill-completed";
    case "in_progress": return "pill pill-progress";
    case "ready_to_submit": return "pill pill-ready";
    default: return "pill pill-not-started";
  }
}

function statusLabel(status) {
  switch (status) {
    case "editing": return "Editing";
    case "completed": return "Completed";
    case "in_progress": return "In Progress";
    case "ready_to_submit": return "Ready";
    default: return "Not Started";
  }
}

function StatusIcon({ status }) {
  if (status === "editing") {
    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>;
  }
  if (status === "completed") {
    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6 9 17l-5-5" /></svg>;
  }
  if (status === "in_progress") {
    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>;
  }
  return null;
}

function groupBarColor(scored, total) {
  if (total === 0) return "var(--text-tertiary)";
  if (scored >= total) return "var(--success)";
  if (scored > 0) return "var(--warning)";
  return "var(--text-tertiary)";
}

function groupTextClass(scored, total) {
  if (total === 0) return "jurors-table-groups jt-zero";
  if (scored >= total) return "jurors-table-groups jt-done";
  if (scored > 0) return "jurors-table-groups jt-partial";
  return "jurors-table-groups jt-zero";
}

// ── Component ────────────────────────────────────────────────

export default function JurorsPage({
  organizationId,
  selectedPeriodId,
  isDemoMode = false,
  onDirtyChange,
  onCurrentSemesterChange,
}) {
  const _toast = useToast();
  const setMessage = (msg) => { if (msg) _toast.success(msg); };
  const [panelError, setPanelErrorState] = useState("");
  const setPanelError = useCallback((_panel, msg) => setPanelErrorState(msg || ""), []);
  const clearPanelError = useCallback(() => setPanelErrorState(""), []);
  const [loadingCount, setLoadingCount] = useState(0);
  const incLoading = useCallback(() => setLoadingCount((c) => c + 1), []);
  const decLoading = useCallback(() => setLoadingCount((c) => Math.max(0, c - 1)), []);

  const periods = useManagePeriods({
    organizationId,
    selectedPeriodId,
    setMessage,
    incLoading,
    decLoading,
    onCurrentPeriodChange: onCurrentSemesterChange,
    setPanelError,
    clearPanelError,
  });

  const projectsHook = useManageProjects({
    organizationId,
    viewPeriodId: periods.viewPeriodId,
    viewPeriodLabel: periods.viewPeriodLabel,
    periodList: periods.periodList,
    setMessage,
    incLoading,
    decLoading,
    setPanelError,
    clearPanelError,
  });

  const jurorsHook = useManageJurors({
    organizationId,
    viewPeriodId: periods.viewPeriodId,
    viewPeriodLabel: periods.viewPeriodLabel,
    projects: projectsHook.projects,
    setMessage,
    incLoading,
    decLoading,
    setPanelError,
    clearPanelError,
    setEvalLockError: periods.setEvalLockError,
  });

  // ── Local UI state ──────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [affilFilter, setAffilFilter] = useState("all");

  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);

  // Drawer
  const [drawerJuror, setDrawerJuror] = useState(null);

  // Add/edit juror modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [formName, setFormName] = useState("");
  const [formAffil, setFormAffil] = useState("");
  const [formSaving, setFormSaving] = useState(false);

  // Reset PIN modal
  const [pinResetJuror, setPinResetJuror] = useState(null);
  const [pinResetting, setPinResetting] = useState(false);

  // Remove juror modal
  const [removeJuror, setRemoveJuror] = useState(null);
  const [removeConfirm, setRemoveConfirm] = useState("");

  // ── Data loading ────────────────────────────────────────────
  useEffect(() => {
    incLoading();
    periods.loadPeriods()
      .catch(() => setPanelError("period", "Could not load periods."))
      .finally(() => decLoading());
  }, [periods.loadPeriods]);

  useEffect(() => {
    if (!periods.viewPeriodId) return;
    incLoading();
    projectsHook.loadProjects()
      .catch(() => setPanelError("project", "Could not load projects."))
      .finally(() => decLoading());
  }, [periods.viewPeriodId, projectsHook.loadProjects]);

  useEffect(() => {
    if (!periods.viewPeriodId) return;
    incLoading();
    jurorsHook.loadJurorsAndEnrich()
      .catch(() => setPanelError("juror", "Could not load jurors."))
      .finally(() => decLoading());
  }, [periods.viewPeriodId, jurorsHook.loadJurorsAndEnrich]);

  // Close menus on outside click
  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpenMenuId(null);
    }
    if (openMenuId) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [openMenuId]);

  const jurorList = jurorsHook.jurors || [];

  // Unique affiliations for filter
  const affiliations = useMemo(() => {
    const set = new Set();
    jurorList.forEach((j) => { if (j.affiliation) set.add(j.affiliation); });
    return [...set].sort();
  }, [jurorList]);

  // Filtered + searched list
  const filteredList = useMemo(() => {
    let list = jurorList;
    if (statusFilter !== "all") {
      list = list.filter((j) => j.overviewStatus === statusFilter);
    }
    if (affilFilter !== "all") {
      list = list.filter((j) => (j.affiliation || "").includes(affilFilter));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((j) =>
        (j.juror_name || "").toLowerCase().includes(q) ||
        (j.affiliation || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [jurorList, statusFilter, affilFilter, search]);

  // KPI stats
  const totalJurors = jurorList.length;
  const completedJurors = jurorList.filter((j) => j.overviewStatus === "completed").length;
  const inProgressJurors = jurorList.filter((j) => j.overviewStatus === "in_progress").length;
  const editingJurors = jurorList.filter((j) => j.overviewStatus === "editing").length;
  const readyJurors = jurorList.filter((j) => j.overviewStatus === "ready_to_submit").length;
  const notStartedJurors = jurorList.filter((j) => j.overviewStatus === "not_started").length;

  // Editing banner (first juror with editing enabled)
  const editingBannerJuror = jurorList.find((j) => j.overviewStatus === "editing");

  // ── Modal handlers ──────────────────────────────────────────

  function openAddModal() {
    setEditTarget(null);
    setFormName("");
    setFormAffil("");
    setAddModalOpen(true);
  }

  function openEditModal(juror) {
    setEditTarget(juror);
    setFormName(juror.juror_name || "");
    setFormAffil(juror.affiliation || "");
    setAddModalOpen(true);
    setOpenMenuId(null);
    setDrawerJuror(null);
  }

  async function handleSaveJuror() {
    if (!formName.trim()) return;
    setFormSaving(true);
    try {
      if (editTarget) {
        await jurorsHook.applyJurorPatch({
          juror_id: editTarget.juror_id || editTarget.jurorId,
          juror_name: formName.trim(),
          affiliation: formAffil.trim(),
        });
        setMessage("Juror updated.");
      } else {
        await jurorsHook.handleAddJuror({
          juror_name: formName.trim(),
          affiliation: formAffil.trim(),
        });
      }
      setAddModalOpen(false);
    } catch {
      // error handled by hook
    } finally {
      setFormSaving(false);
    }
  }

  function openPinResetModal(juror) {
    setPinResetJuror(juror);
    setOpenMenuId(null);
    setDrawerJuror(null);
  }

  async function handleResetPin() {
    if (!pinResetJuror) return;
    const jid = pinResetJuror.juror_id || pinResetJuror.jurorId;
    setPinResetting(true);
    try {
      // The hook's pinResetTarget setter is not exposed directly,
      // so we use the lower-level approach through the hook's internal API
      // via applyJurorPatch or we call resetJurorPin from API directly.
      // Actually useManageJurors exposes pinResetTarget etc, but the flow
      // is managed internally. We'll just set pinResetTarget via the hook.
      jurorsHook.pinResetTarget; // the hook owns this state
      // For now, trigger the hook reset flow by calling the API
      const { resetJurorPin } = await import("../../shared/api");
      const result = await resetJurorPin(organizationId, jid);
      if (result?.pin) {
        jurorsHook.resetPinInfo; // for reference
        _toast.success(`PIN reset for ${pinResetJuror.juror_name}`);
        setPinResetJuror(null);
        // Show the revealed PIN in a simple alert for now
        // In future: use a proper PIN reveal modal
        setPinReveal({ name: pinResetJuror.juror_name, pin: String(result.pin) });
      }
    } catch {
      _toast.error("Failed to reset PIN.");
    } finally {
      setPinResetting(false);
    }
  }

  // PIN reveal state
  const [pinReveal, setPinReveal] = useState(null);
  const [pinCopied, setPinCopied] = useState(false);

  function copyPin() {
    if (!pinReveal) return;
    navigator.clipboard.writeText(pinReveal.pin).then(() => {
      setPinCopied(true);
      setTimeout(() => setPinCopied(false), 2000);
    });
  }

  function openRemoveModal(juror) {
    setRemoveJuror(juror);
    setRemoveConfirm("");
    setOpenMenuId(null);
    setDrawerJuror(null);
  }

  async function handleRemoveJuror() {
    if (!removeJuror) return;
    const name = removeJuror.juror_name || "";
    if (removeConfirm.trim() !== name.trim()) return;
    try {
      await jurorsHook.removeJuror(removeJuror.juror_id || removeJuror.jurorId);
      setRemoveJuror(null);
    } catch {
      // handled by hook
    }
  }

  return (
    <div>
      {/* Editing mode banner */}
      {editingBannerJuror && (
        <div className="fb-banner fbb-editing">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          <span className="fb-banner-text">
            Editing enabled for <strong>{editingBannerJuror.juror_name}</strong> — changes will overwrite existing scores
          </span>
          <span className="fb-banner-action" style={{ color: "var(--fb-editing-text)" }}>Disable editing →</span>
        </div>
      )}

      {/* Header */}
      <div className="jurors-page-header">
        <div className="jurors-page-header-top">
          <div className="jurors-page-header-left">
            <div className="page-title">Jurors</div>
            <div className="page-desc">Manage juror assignments, progress, access, and scoring activity across the active term.</div>
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div className="scores-kpi-strip">
        <div className="scores-kpi-item"><div className="scores-kpi-item-value">{totalJurors}</div><div className="scores-kpi-item-label">Jurors</div></div>
        <div className="scores-kpi-item"><div className="scores-kpi-item-value"><span className="success">{completedJurors}</span></div><div className="scores-kpi-item-label">Completed</div></div>
        <div className="scores-kpi-item"><div className="scores-kpi-item-value" style={{ color: "var(--warning)" }}>{inProgressJurors}</div><div className="scores-kpi-item-label">In Progress</div></div>
        <div className="scores-kpi-item"><div className="scores-kpi-item-value" style={{ color: "#a78bfa" }}>{editingJurors}</div><div className="scores-kpi-item-label">Editing</div></div>
        <div className="scores-kpi-item"><div className="scores-kpi-item-value"><span className="accent">{readyJurors}</span></div><div className="scores-kpi-item-label">Ready</div></div>
        <div className="scores-kpi-item"><div className="scores-kpi-item-value">{notStartedJurors}</div><div className="scores-kpi-item-label">Not Started</div></div>
      </div>

      {/* Toolbar */}
      <div className="jurors-toolbar">
        <div className="jurors-search-wrap">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            className="search-input"
            type="text"
            placeholder="Search jurors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="btn btn-outline btn-sm" onClick={() => { setFilterOpen((v) => !v); setExportOpen(false); }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "-1px" }}>
            <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
          </svg>
          {" "}Filter
        </button>
        <div className="jurors-toolbar-spacer" />
        <button className="btn btn-outline btn-sm" onClick={() => { setExportOpen((v) => !v); setFilterOpen(false); }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "-1px" }}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          {" "}Export
        </button>
        <button className="btn btn-outline btn-sm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "-1px" }}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          {" "}Import
        </button>
        <button
          className="btn btn-primary btn-sm"
          style={{ width: "auto", padding: "6px 14px", fontSize: "12px", background: "var(--accent)", boxShadow: "none" }}
          onClick={openAddModal}
        >
          + Add Juror
        </button>
      </div>

      {/* Filter panel */}
      {filterOpen && (
        <div className="filter-panel">
          <div className="filter-panel-header">
            <div>
              <h4>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "-1px", marginRight: "4px", opacity: 0.5 }}>
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                </svg>
                Filter Jurors
              </h4>
              <div className="filter-panel-sub">Narrow jurors by status, affiliation, and scoring progress.</div>
            </div>
            <button className="filter-panel-close" onClick={() => setFilterOpen(false)}>&#215;</button>
          </div>
          <div className="filter-row">
            <div className="filter-group">
              <label>Status</label>
              <select className="modal-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ height: "32px", fontSize: "12px" }}>
                <option value="all">All statuses</option>
                <option value="completed">Completed</option>
                <option value="in_progress">In Progress</option>
                <option value="not_started">Not Started</option>
                <option value="editing">Editing</option>
                <option value="ready_to_submit">Ready</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Affiliation</label>
              <select className="modal-input" value={affilFilter} onChange={(e) => setAffilFilter(e.target.value)} style={{ height: "32px", fontSize: "12px" }}>
                <option value="all">All affiliations</option>
                {affiliations.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <button className="btn btn-outline btn-sm filter-clear-btn" onClick={() => { setStatusFilter("all"); setAffilFilter("all"); }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
                <path d="M18 6 6 18" /><path d="m6 6 12 12" />
              </svg>
              {" "}Clear all
            </button>
          </div>
        </div>
      )}

      {/* Export panel */}
      {exportOpen && (
        <div className="export-panel">
          <div className="export-panel-header">
            <div>
              <h4>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Export Jurors
              </h4>
              <div className="export-panel-sub">Download the juror roster with status, affiliation, and scoring progress.</div>
            </div>
            <button className="export-panel-close" onClick={() => setExportOpen(false)}>&#215;</button>
          </div>
          <div className="export-footer" style={{ borderTop: "none" }}>
            <div className="export-footer-info">
              <div className="export-footer-format">Excel (.xlsx) · Jurors</div>
              <div className="export-footer-meta">{periods.viewPeriodLabel} · {totalJurors} jurors</div>
            </div>
            <button className="btn btn-primary btn-sm export-download-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download Excel
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {panelError && (
        <div className="fb-alert fba-danger" style={{ marginBottom: "12px" }}>
          <div className="fb-alert-body">{panelError}</div>
        </div>
      )}

      {/* Table */}
      <div className="table-wrap" style={{ borderRadius: "var(--radius) var(--radius) 0 0" }}>
        <table id="jurors-main-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Affiliation</th>
              <th className="text-center">Groups</th>
              <th>Status</th>
              <th>Last Active</th>
              <th style={{ width: "48px" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loadingCount > 0 && filteredList.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", color: "var(--text-tertiary)", padding: "32px" }}>
                  Loading jurors…
                </td>
              </tr>
            ) : filteredList.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", color: "var(--text-tertiary)", padding: "32px" }}>
                  No jurors found.
                </td>
              </tr>
            ) : filteredList.map((juror) => {
              const jid = juror.juror_id || juror.jurorId;
              const name = juror.juror_name || "";
              const scored = juror.overviewScoredProjects || 0;
              const total = juror.overviewTotalProjects || 0;
              const pct = total > 0 ? Math.round((scored / total) * 100) : 0;
              const status = juror.overviewStatus || "not_started";
              const lastActive = juror.last_activity_at || juror.finalSubmittedAt || juror.final_submitted_at;

              return (
                <tr key={jid} onClick={() => setDrawerJuror(juror)}>
                  <td>
                    <div className="j-row">
                      <div className="j-av" style={{ background: avatarColor(name) }}>{initials(name)}</div>
                      <div className="jurors-table-name">
                        <span className="jt-name">{name}</span>
                      </div>
                    </div>
                  </td>
                  <td className="text-sm">{juror.affiliation || "—"}</td>
                  <td className="text-center">
                    <span className={groupTextClass(scored, total)}>
                      {scored} / {total}
                      <span className="jurors-group-bar">
                        <span className="jurors-group-bar-fill" style={{ width: `${pct}%`, background: groupBarColor(scored, total) }} />
                      </span>
                    </span>
                  </td>
                  <td>
                    <span className={statusPillClass(status)}>
                      <StatusIcon status={status} />
                      {statusLabel(status)}
                    </span>
                  </td>
                  <td className="jurors-table-active" data-tooltip={formatFull(lastActive)}>
                    {formatRelative(lastActive)}
                  </td>
                  <td>
                    <div className="juror-action-wrap" ref={openMenuId === jid ? menuRef : null}>
                      <button
                        className="juror-action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId((prev) => (prev === jid ? null : jid));
                        }}
                        title="Actions"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <circle cx="12" cy="5" r="2" />
                          <circle cx="12" cy="12" r="2" />
                          <circle cx="12" cy="19" r="2" />
                        </svg>
                      </button>
                      {openMenuId === jid && (
                        <div className="juror-action-menu open">
                          <div className="juror-action-item" onClick={(e) => { e.stopPropagation(); openEditModal(juror); }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                            </svg>
                            Edit Juror
                          </div>
                          <div className="juror-action-item" onClick={(e) => { e.stopPropagation(); openPinResetModal(juror); }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <rect x="3" y="11" width="18" height="10" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                            Reset PIN
                          </div>
                          <div className="juror-action-sep" />
                          <div className="juror-action-item danger" onClick={(e) => { e.stopPropagation(); openRemoveModal(juror); }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                            Remove Juror
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="jurors-pagination">
        <div className="jurors-pagination-info">
          <span>Showing 1–{filteredList.length} of {filteredList.length} jurors</span>
        </div>
        <div className="jurors-pagination-pages">
          <button disabled>‹ Prev</button>
          <button className="active" disabled aria-current="page" title="Current page">1</button>
          <button disabled>Next ›</button>
        </div>
      </div>

      {/* ═══════ JUROR DETAIL DRAWER ═══════ */}
      {drawerJuror && (
        <>
          <div className="juror-drawer-overlay show" onClick={() => setDrawerJuror(null)} />
          <div className="juror-drawer show">
            <div className="juror-drawer-header">
              <span className="jd-title">Juror Details</span>
              <button className="juror-drawer-close" onClick={() => setDrawerJuror(null)}>×</button>
            </div>
            <div className="juror-drawer-profile">
              <div className="juror-drawer-avatar" style={{ background: avatarColor(drawerJuror.juror_name) }}>
                {initials(drawerJuror.juror_name)}
              </div>
              <div className="juror-drawer-info">
                <div className="juror-drawer-name">{drawerJuror.juror_name}</div>
                <div className="juror-drawer-inst">{drawerJuror.affiliation || "—"}</div>
              </div>
            </div>
            <div className="juror-drawer-details">
              <div className="juror-drawer-row">
                <span className="juror-drawer-row-label">Status</span>
                <span className="juror-drawer-row-value">
                  <span className={statusPillClass(drawerJuror.overviewStatus)} style={{ fontSize: "10px" }}>
                    <StatusIcon status={drawerJuror.overviewStatus} />
                    {statusLabel(drawerJuror.overviewStatus)}
                  </span>
                </span>
              </div>
              <div className="juror-drawer-row">
                <span className="juror-drawer-row-label">Groups Scored</span>
                <span className="juror-drawer-row-value">
                  {drawerJuror.overviewScoredProjects || 0} / {drawerJuror.overviewTotalProjects || 0}
                </span>
              </div>
              <div className="juror-drawer-row">
                <span className="juror-drawer-row-label">Last Active</span>
                <span className="juror-drawer-row-value">
                  {formatFull(drawerJuror.last_activity_at || drawerJuror.finalSubmittedAt || drawerJuror.final_submitted_at) || "—"}
                </span>
              </div>
              <div className="juror-drawer-row">
                <span className="juror-drawer-row-label">Edit Mode</span>
                <span className="juror-drawer-row-value">
                  {(drawerJuror.edit_enabled || drawerJuror.editEnabled) ? "On" : "Off"}
                </span>
              </div>
            </div>
            <div className="juror-drawer-actions">
              <button className="btn btn-outline btn-sm" onClick={() => openEditModal(drawerJuror)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                </svg>
                Edit Juror
              </button>
              <button className="btn btn-outline btn-sm" onClick={() => openPinResetModal(drawerJuror)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="10" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Reset PIN
              </button>
              <button
                className="btn btn-outline btn-sm"
                style={{ color: "var(--danger)", borderColor: "rgba(225,29,72,0.3)" }}
                onClick={() => openRemoveModal(drawerJuror)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                  <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                Remove Juror
              </button>
            </div>
          </div>
        </>
      )}

      {/* ═══════ MODALS ═══════ */}

      {/* Add/Edit Juror Modal */}
      {addModalOpen && (
        <div className="modal-overlay" onClick={() => setAddModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{editTarget ? "Edit Juror" : "Add Juror"}</span>
              <button className="juror-drawer-close" onClick={() => setAddModalOpen(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="modal-field">
                <label className="modal-label">Full Name <span className="field-req">*</span></label>
                <input
                  className="modal-input"
                  type="text"
                  placeholder="Doç. Dr. Ayşe Yılmaz"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="modal-field" style={{ marginTop: "12px" }}>
                <label className="modal-label">Affiliation</label>
                <input
                  className="modal-input"
                  type="text"
                  placeholder="Hacettepe Üniversitesi / EE"
                  value={formAffil}
                  onChange={(e) => setFormAffil(e.target.value)}
                />
                <div className="field-helper fh-hint">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
                  University or organization
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline btn-sm" onClick={() => setAddModalOpen(false)} disabled={formSaving}>Cancel</button>
              <button
                className="btn btn-sm"
                style={{ background: "var(--accent)", color: "#fff" }}
                onClick={handleSaveJuror}
                disabled={formSaving || !formName.trim()}
              >
                {formSaving ? "Saving…" : editTarget ? "Save Changes" : "Add Juror"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset PIN Modal */}
      {pinResetJuror && !pinReveal && (
        <div className="modal-overlay" onClick={() => setPinResetJuror(null)}>
          <div className="modal-card" style={{ maxWidth: "400px" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Reset PIN</span>
              <button className="juror-drawer-close" onClick={() => setPinResetJuror(null)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "var(--warning-soft)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "13px", marginBottom: "4px" }}>Are you sure?</div>
                  <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    This will generate a new 4-digit PIN for <strong>{pinResetJuror.juror_name}</strong>. Their current PIN will be invalidated immediately.
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline btn-sm" onClick={() => setPinResetJuror(null)} disabled={pinResetting}>Cancel</button>
              <button
                className="btn btn-sm"
                style={{ background: "var(--warning)", color: "#fff" }}
                onClick={handleResetPin}
                disabled={pinResetting}
              >
                {pinResetting ? "Resetting…" : "Reset PIN"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PIN Reveal Modal */}
      {pinReveal && (
        <div className="modal-overlay" onClick={() => setPinReveal(null)}>
          <div className="modal-card" style={{ maxWidth: "380px" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">New PIN Generated</span>
              <button className="juror-drawer-close" onClick={() => setPinReveal(null)}>×</button>
            </div>
            <div className="modal-body" style={{ textAlign: "center", padding: "28px 24px" }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "var(--success-soft)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2" strokeLinecap="round"><path d="M20 6 9 17l-5-5" /></svg>
              </div>
              <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "16px" }}>
                PIN for <strong>{pinReveal.name}</strong> has been reset successfully.
              </div>
              <div style={{
                fontFamily: "var(--mono)", fontSize: "36px", fontWeight: 800, letterSpacing: "12px",
                color: "var(--text-primary)", background: "var(--surface-1)", border: "2px dashed var(--border)",
                borderRadius: "var(--radius)", padding: "18px 24px", display: "inline-block"
              }}>
                {pinReveal.pin}
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-tertiary)", marginTop: "12px" }}>
                Share this PIN securely with the juror. It will not be shown again.
              </div>
            </div>
            <div className="modal-footer" style={{ justifyContent: "center" }}>
              <button className="btn btn-outline btn-sm" onClick={copyPin}>
                {pinCopied ? "Copied!" : "Copy PIN"}
              </button>
              <button className="btn btn-sm" style={{ background: "var(--accent)", color: "#fff" }} onClick={() => setPinReveal(null)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Juror Modal */}
      {removeJuror && (
        <div className="modal-overlay" onClick={() => setRemoveJuror(null)}>
          <div className="modal-card" style={{ maxWidth: "420px" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title" style={{ color: "var(--danger)" }}>Remove Juror</span>
              <button className="juror-drawer-close" onClick={() => setRemoveJuror(null)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "var(--danger-soft)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2" strokeLinecap="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "13px", marginBottom: "4px" }}>This action cannot be undone</div>
                  <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    Removing <strong>{removeJuror.juror_name}</strong> will delete all their scores and evaluation data for this evaluation period. Type the juror's name to confirm.
                  </div>
                  <input
                    className="modal-input"
                    type="text"
                    placeholder="Type juror name..."
                    value={removeConfirm}
                    onChange={(e) => setRemoveConfirm(e.target.value)}
                    style={{ marginTop: "10px" }}
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline btn-sm" onClick={() => setRemoveJuror(null)}>Cancel</button>
              <button
                className="btn btn-sm"
                style={{ background: "var(--danger)", color: "#fff" }}
                onClick={handleRemoveJuror}
                disabled={removeConfirm.trim() !== (removeJuror.juror_name || "").trim()}
              >
                Remove Juror
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
