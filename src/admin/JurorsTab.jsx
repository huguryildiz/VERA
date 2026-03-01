// src/admin/JurorsTab.jsx

import { useState, useMemo, useEffect } from "react";
import { PROJECTS } from "../config";
import { formatTs, adminCompletionPct, cmp } from "./utils";
import { readSection, writeSection } from "./persist";
import { StatusBadge } from "./components";
import { CircleCheckBigIcon, UsersRoundIcon, FolderKanbanIcon, ClockIcon, UserCheckIcon, ChevronDownIcon } from "../shared/Icons";

const PROJECT_LIST = PROJECTS.map((p, i) =>
  typeof p === "string"
    ? { id: i + 1, name: p, desc: "", students: [] }
    : { id: p.id ?? i + 1, name: p.name ?? `Group ${i + 1}`, desc: p.desc ?? "", students: p.students ?? [] }
);

// jurors prop: { key, name, dept, jurorId }[]
export default function JurorsTab({ jurorStats, onPinReset, onAllowEdit }) {
  const [selectedJurorId, setSelectedJurorId] = useState(() => {
    const s = readSection("jurors");
    return typeof s.selectedJurorId === "string" ? s.selectedJurorId : "";
  });

  useEffect(() => {
    writeSection("jurors", { selectedJurorId });
  }, [selectedJurorId]);
  const [allowEditState, setAllowEditState] = useState({});
  const [expandedGroups, setExpandedGroups] = useState(new Set());

  function toggleGroup(groupKey) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      next.has(groupKey) ? next.delete(groupKey) : next.add(groupKey);
      return next;
    });
  }

  const jurorOptions = useMemo(() => {
    return jurorStats
      .slice()
      .sort((a, b) => cmp(a.jury, b.jury))
      .map((s) => ({
        id: s.jurorId || s.latestRow?.jurorId || "",
        label: `${s.jury}${s.latestRow?.juryDept ? ` (${s.latestRow.juryDept})` : ""}`,
      }))
      .filter((opt, idx, arr) => opt.id && arr.findIndex((o) => o.id === opt.id) === idx);
  }, [jurorStats]);

  const filtered = useMemo(() => {
    let list = jurorStats
      .slice()
      .sort((a, b) => cmp(a.jury, b.jury));
    if (selectedJurorId) {
      list = list.filter((s) => (s.jurorId || s.latestRow?.jurorId || "") === selectedJurorId);
    }
    return list;
  }, [jurorStats, selectedJurorId]);

  return (
    <div className="jurors-tab-wrap">
      {/* Search bar */}
      <div className="juror-filter-bar">
        <select
          className="juror-filter-select"
          value={selectedJurorId}
          onChange={(e) => setSelectedJurorId(e.target.value)}
          aria-label="Filter by juror"
        >
          <option value="">All jurors</option>
          {jurorOptions.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 && (
        <div className="empty-msg">No jurors match the current filter.</div>
      )}

      <div className="jurors-grid jurors-grid-full">
        {filtered.map((stat) => {
          const { key, jury, rows, overall, latestRow } = stat;

          // Progress bar: matches Jury Form sticky header (criteria filled / total criteria).
          const pct = adminCompletionPct(rows);

          const barColor =
            pct === 100 ? "#22c55e" :
            pct > 66    ? "#84cc16" :
            pct > 33    ? "#eab308" :
            pct > 0     ? "#f97316" : "#e2e8f0";

          const isEditing = rows.some((r) => r.editingFlag === "editing");
          const groups = PROJECT_LIST.map((p) => {
            const row = rows.find((r) => r.projectId === p.id);
            const normalizedStatus =
              row?.status === "group_submitted" || row?.status === "all_submitted"
                ? "submitted"
                : row?.status || "not_started";
            return { id: p.id, status: normalizedStatus };
          });
          const isCompleted =
            groups.length > 0 &&
            groups.every((g) => g.status === "submitted");

          const statusClass = isEditing
            ? "juror-card-editing"
            : overall === "all_submitted" ? "juror-card-all-submitted"
            : overall === "in_progress"   ? "juror-card-in-progress"
            : "";

          return (
            <div key={key} className={`juror-card ${statusClass}`}>

              <div className="juror-card-header">
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="juror-name" style={{ wordBreak: "break-word" }}>
                    <span className="juror-name-icon" aria-hidden="true"><UserCheckIcon /></span>
                    <span className="juror-name-text">
                      {jury}
                      {latestRow?.juryDept && (
                        <span className="juror-dept-inline"> ({latestRow.juryDept})</span>
                      )}
                    </span>
                  </div>
                  <div className="juror-header-actions">
                    {isEditing ? (
                      <StatusBadge editingFlag="editing" />
                    ) : isCompleted ? (
                      <StatusBadge
                        variant="completed"
                        icon={<CircleCheckBigIcon />}
                      >
                        Completed
                      </StatusBadge>
                    ) : (
                      <StatusBadge status={overall} />
                    )}
                  </div>
                </div>

                <div className="juror-meta">
                  {latestRow?.timestamp && (
                    <div className="juror-last-submit">
                      <span className="juror-last-submit-label">Last activity</span>
                      <span className="juror-last-submit-time">
                        {formatTs(latestRow?.timestamp)}
                      </span>
                    </div>
                  )}
                  {onAllowEdit && overall === "all_submitted" && !isEditing && (
                    <button
                      className={`allow-edit-btn${allowEditState[key] === "ok" ? " success" : ""}`}
                      title={`Allow ${jury} to edit their scores`}
                      onClick={async () => {
                        setAllowEditState((prev) => ({ ...prev, [key]: "loading" }));
                        const json = await onAllowEdit(jury, latestRow?.juryDept || "", latestRow?.jurorId || "");
                        setAllowEditState((prev) => ({ ...prev, [key]: json?.status === "ok" ? "ok" : "error" }));
                      }}
                    >
                      {allowEditState[key] === "ok" ? "✓ Edit Allowed" : "Allow Edit"}
                    </button>
                  )}
                  {onPinReset && (
                    <button
                      className="juror-reset-pill"
                      title={`Reset PIN for ${jury}`}
                      onClick={() => onPinReset(jury, latestRow?.juryDept || "", latestRow?.jurorId || "")}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-key-round-icon lucide-key-round" aria-hidden="true">
                        <path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z"/>
                        <circle cx="16.5" cy="7.5" r=".5" fill="currentColor"/>
                      </svg>
                      Reset PIN
                    </button>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div className="juror-progress-wrap">
                <div className="juror-progress-bar-bg">
                  <div
                    className="juror-progress-bar-fill"
                    style={{ width: `${pct}%`, background: barColor }}
                  />
                </div>
                <span className="juror-progress-label">{pct}%</span>
              </div>

              {/* Per-group rows — accordion */}
              <div className="juror-projects">
                {rows
                  .slice()
                  .sort((a, b) => a.projectId - b.projectId)
                  .map((d) => {
                    const grp = PROJECT_LIST.find((p) => p.id === d.projectId);
                    const groupKey = `${key}-${d.projectId}`;
                    const isExpanded = expandedGroups.has(groupKey);
                    const panelId = `juror-group-panel-${groupKey}`;
                    const hasDetails = !!grp?.desc || grp?.students?.length > 0;
                    return (
                      <div key={groupKey} className="juror-row-wrap">
                        {/* Clickable row header */}
                        <div
                          className="juror-row group-accordion-header"
                          role="button"
                          tabIndex={hasDetails ? 0 : -1}
                          aria-expanded={isExpanded}
                          aria-controls={panelId}
                          onClick={() => { if (hasDetails) toggleGroup(groupKey); }}
                          onKeyDown={(e) => {
                            if ((e.key === "Enter" || e.key === " ") && hasDetails) {
                              e.preventDefault();
                              toggleGroup(groupKey);
                            }
                          }}
                          style={{ cursor: hasDetails ? "pointer" : "default" }}
                        >
                          {/* LEFT: identity column */}
                          <div className="juror-row-left">
                            <div className="juror-row-header-line">
                              <span className="juror-row-name">
                                {grp?.name || `Group ${d.projectId}`}
                              </span>
                              {hasDetails && (
                                <span className={`group-accordion-chevron${isExpanded ? " open" : ""}`}>
                                  <ChevronDownIcon />
                                </span>
                              )}
                            </div>
                          </div>
                          {/* RIGHT: KPI stack */}
                          <div className="juror-row-right">
                            {d.timestamp && (
                              <span className="juror-row-ts">
                                <span className="juror-row-ts-icon" aria-hidden="true"><ClockIcon /></span>
                                {formatTs(d.timestamp)}
                              </span>
                            )}
                            <StatusBadge status={d.status} />
                            {(d.status === "all_submitted" || d.status === "group_submitted") && (
                              <span
                                className="juror-score"
                                title="/ 100"
                                aria-label={`${d.total} / 100`}
                              >
                                {d.total}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Expandable panel */}
                        <div
                          id={panelId}
                          className={`group-accordion-panel${isExpanded ? " open" : ""}`}
                        >
                          <div className="group-accordion-panel-inner juror-accordion-inner">
                            {grp?.desc && (
                              <span className="juror-row-desc group-card-desc">
                                <span className="group-card-desc-icon" aria-hidden="true"><FolderKanbanIcon /></span>
                                <span className="group-card-desc-text">{grp.desc}</span>
                              </span>
                            )}
                            {grp?.students?.length > 0 && (
                              <span className="juror-row-students group-card-students">
                                <span className="group-card-students-icon" aria-hidden="true"><UsersRoundIcon /></span>
                                <span className="group-card-students-text">{grp.students.join(" · ")}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
