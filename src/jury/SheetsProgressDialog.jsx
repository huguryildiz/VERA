// src/jury/SheetsProgressDialog.jsx
// ============================================================
// Modal dialog shown after PIN verification.
//
// Always displayed — Supabase is the master source of truth.
// Shows how many groups have been scored and lets the juror
// decide whether to continue (resume) or start fresh.
// Both actions advance to the eval step; scores are always
// seeded from the database regardless of which button is used.
//
// Props:
//   progress  { rows, filledCount, totalCount, allSubmitted, editAllowed }
//   projects  [{ project_id, group_no, project_title, group_students }]
//   onConfirm () → advance to eval (used when hasData)
//   onFresh   () → advance to eval (used when no prior data)
// ============================================================

import { useEffect, useRef, useState } from "react";
import {
  BadgeCheckIcon,
  SaveIcon,
  ChevronDownIcon,
  LoaderIcon,
  HistoryIcon,
  InfoIcon,
} from "../shared/Icons";
import { cn } from "@/lib/utils";
import { jurorStatusMeta } from "../admin/scoreHelpers";
import MinimalLoaderOverlay from "../shared/MinimalLoaderOverlay";
import { formatTs as formatShortTs } from "../admin/utils";
import { GroupLabel, ProjectTitle, StudentNames } from "../components/EntityMeta";

/* Tailwind equivalents for status-badge color variants */
const statusBadgeColors = {
  "status-green":      "bg-green-100 text-green-800 border border-green-300",
  "status-green-soft": "bg-green-50 text-green-700 border border-green-200",
  "status-blue":       "bg-blue-100 text-blue-800 border border-blue-300",
  "status-amber":      "bg-yellow-100 text-amber-800 border border-yellow-300",
  "status-gray":       "bg-slate-100 text-slate-500 border border-slate-200",
  "status-purple":     "bg-violet-100 text-violet-700 border border-violet-300",
};

function resolveStatusBadgeColor(colorClass) {
  return statusBadgeColors[colorClass] || statusBadgeColors["status-gray"];
}

function statusToChip(key, fallback = "empty") {
  const meta = jurorStatusMeta[key] ?? jurorStatusMeta[fallback];
  const Icon = meta.icon;
  return { label: meta.label, tone: key, colorClass: meta.colorClass, icon: <Icon /> };
}

// Status label + colour for each row returned by myscores.
function rowStatusChip(status) {
  const key =
    status === "scored" ||
    status === "group_submitted" ||
    status === "all_submitted" ||
    status === "submitted"
      ? "scored"
      : (status === "partial" || status === "in_progress" ? "partial" : "empty");
  return statusToChip(key, "empty");
}

function jurorStatusChip({ isEditing, allSubmitted, filledCount, totalCount, hasData }) {
  const key = isEditing
    ? "editing"
    : allSubmitted
      ? "completed"
      : (totalCount > 0 && filledCount >= totalCount)
        ? "ready_to_submit"
        : hasData
          ? "in_progress"
          : "not_started";
  return statusToChip(key, "not_started");
}

/* Juror pill shadow for different tones */
const pillShadow = {
  completed: "shadow-[0_10px_20px_rgba(34,197,94,0.24),0_0_0_3px_rgba(34,197,94,0.14)]",
  ready_to_submit: "shadow-[0_10px_20px_rgba(37,99,235,0.22),0_0_0_3px_rgba(59,130,246,0.16)]",
  in_progress: "shadow-[0_10px_20px_rgba(234,179,8,0.2),0_0_0_3px_rgba(234,179,8,0.14)]",
  editing: "shadow-[0_10px_20px_rgba(245,158,11,0.2),0_0_0_3px_rgba(245,158,11,0.14)]",
  not_started: "shadow-[0_8px_16px_rgba(100,116,139,0.16),0_0_0_2px_rgba(100,116,139,0.08)]",
};

export default function SheetsProgressDialog({ progress, projects, onConfirm, onFresh }) {
  if (!progress) return null;

  // Loading sentinel — shown while fetchMyScores is in flight.
  const suppress = typeof document !== "undefined" &&
    document.body?.classList?.contains("auth-overlay-open");
  const showLoader = progress.loading && !suppress;

  const {
    rows,
    filledCount,
    totalCount,
    criteriaFilledCount,
    criteriaTotalCount,
    allSubmitted,
    editAllowed,
  } = progress;
  const progressPct = (criteriaTotalCount || 0) > 0
    ? Math.round(((criteriaFilledCount || 0) / criteriaTotalCount) * 100)
    : (totalCount ? Math.round((filledCount / totalCount) * 100) : 0);
  const projectGroupLabel = totalCount === 1 ? "project group" : "project groups";
  const progressText = totalCount === 0
    ? "No project groups available"
    : `${filledCount} of ${totalCount} ${projectGroupLabel} scored`;
  const barColor =
    progressPct === 100 ? "#22c55e" :
    progressPct > 66    ? "#84cc16" :
    progressPct > 33    ? "#eab308" :
    progressPct > 0     ? "#f97316" : "#e2e8f0";
  const hasData = rows && rows.length > 0;
  const projectList = Array.isArray(projects) ? projects : [];
  const [openGroup, setOpenGroup] = useState(null);
  const overlayRef = useRef(null);
  const listRef = useRef(null);
  const isEditing = hasData && rows.some((r) => r.editingFlag === "editing");
  const jurorChip = jurorStatusChip({ isEditing, allSubmitted, filledCount, totalCount, hasData });

  const toggleGroup = (groupId) => {
    setOpenGroup((prev) => (prev === groupId ? null : groupId));
  };

  useEffect(() => {
    overlayRef.current?.scrollTo?.(0, 0);
  }, [progress?.loading, hasData]);

  useEffect(() => {
    const root = listRef.current;
    if (!root) return;

    const targets = Array.from(root.querySelectorAll(".swipe-x"));
    if (!targets.length) return;

    const updateHint = (el) => {
      const hasOverflow = el.scrollWidth > el.clientWidth + 1;
      el.classList.toggle("is-overflowing", hasOverflow);
      el.classList.toggle("is-scrolled", el.scrollLeft > 0);
    };
    const handleScroll = (e) => updateHint(e.currentTarget);

    targets.forEach((el) => {
      el.scrollLeft = 0;
      updateHint(el);
      el.addEventListener("scroll", handleScroll, { passive: true });
      el.addEventListener("pointerenter", handleScroll);
      el.addEventListener("touchstart", handleScroll, { passive: true });
    });

    const rafId = requestAnimationFrame(() => {
      targets.forEach(updateHint);
    });
    // 220 ms: wait for dialog entrance animation to settle before measuring overflow
    const timerId = setTimeout(() => {
      targets.forEach(updateHint);
    }, 220);

    let ro = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => {
        targets.forEach(updateHint);
      });
      targets.forEach((el) => ro.observe(el));
    }

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timerId);
      targets.forEach((el) => {
        el.removeEventListener("scroll", handleScroll);
        el.removeEventListener("pointerenter", handleScroll);
        el.removeEventListener("touchstart", handleScroll);
      });
      ro?.disconnect();
    };
  }, [projectList, openGroup, rows]);

  return (
    <>
      <MinimalLoaderOverlay open={showLoader} minDuration={400} />
      {!progress.loading && (
        <div className="fixed inset-0 z-[360] flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm" ref={overlayRef}>
          <div className="flex w-full max-w-[520px] flex-col gap-4.5 rounded-2xl bg-card p-5 shadow-xl max-h-[min(740px,82vh)] overflow-hidden text-left sm:p-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="inline-flex shrink-0 items-center justify-center [&_svg]:size-[26px] [&_svg]:text-indigo-900" aria-hidden="true">
              {allSubmitted ? (
                <BadgeCheckIcon />
              ) : hasData ? (
                <SaveIcon />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-save-icon lucide-save" aria-hidden="true">
                  <path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
                  <path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7" />
                  <path d="M7 3v4a1 1 0 0 0 1 1h7" />
                </svg>
              )}
            </div>
            <div className="flex min-w-0 flex-col gap-0.5">
              <div className="text-lg font-bold leading-tight text-foreground" title={allSubmitted
                ? "All evaluations submitted"
                : hasData
                ? "Previous progress found"
                : "No evaluations found"}>
                {allSubmitted
                  ? "All evaluations submitted"
                  : hasData
                  ? "Previous progress found"
                  : "No evaluations found"}
              </div>
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                <div className="truncate text-[13px] text-muted-foreground" title={progressText}>
                  {progressText}
                </div>
                <div className="flex shrink-0 items-center">
                  <span className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold whitespace-nowrap [&_svg]:size-3",
                    resolveStatusBadgeColor(jurorChip.colorClass),
                    pillShadow[jurorChip.tone]
                  )}>
                    {jurorChip.icon}
                    {jurorChip.label}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-1.5 flex items-center gap-2.5">
          <span className="inline-flex shrink-0 items-center [&_svg]:size-3.5 [&_svg]:animate-spin" aria-hidden="true">
            <LoaderIcon />
          </span>
          <div className="flex-1 min-w-0 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full transition-[width,background] duration-300 ease-out"
              style={{ width: `${progressPct}%`, background: barColor }}
            />
          </div>
          <span className="min-w-[34px] shrink-0 text-right text-xs font-bold text-muted-foreground">{progressPct}%</span>
        </div>

        {/* Per-group status list */}
        <div
          className="flex flex-col gap-1 rounded-lg border bg-muted/40 px-2.5 py-2 max-h-[min(320px,42vh)] flex-1 min-h-0 overflow-y-auto overscroll-contain"
          style={{ scrollbarGutter: "stable", scrollbarWidth: "thin" }}
          ref={listRef}
        >
          {hasData ? (
            <>
              <div className="hidden text-[10px] font-bold uppercase tracking-wider text-muted-foreground" style={{ display: "none" }} aria-hidden="true">
                <span className="text-left">Group</span>
                <span className="text-right">Last Update</span>
                <span className="text-right">Status</span>
                <span className="text-right">Score</span>
              </div>
              {projectList.map((p) => {
              const row = rows.find((r) => r.projectId === p.project_id);
              const chip = rowStatusChip(row?.scoreStatus || row?.status);
              const total = row?.total
                ?? (chip.tone === "partial" && Number.isFinite(row?.partialTotal) ? row.partialTotal : "—");
              const timestamp = formatShortTs(row?.timestamp || "—");
              const isOpen = openGroup === p.project_id;
                  const name = `Group ${p.group_no}`;
              const students = p.group_students
                ? p.group_students.split(",").map((s) => s.trim()).filter(Boolean)
                : [];
              const hasDetails = Boolean(p.project_title) || students.length > 0;

              return (
                <div key={p.project_id} className="flex flex-col border-b border-border/40 last:border-b-0 py-[3px]">
                  <div
                    className="grid items-center text-[13px] min-w-0"
                    style={{
                      gridTemplateColumns: "minmax(0,1fr) var(--spd-col-time,160px) auto var(--spd-col-score,3ch)",
                      gridTemplateAreas: '"group ts pill score"',
                      columnGap: "10px",
                      rowGap: "2px",
                    }}
                  >
                    <button
                      className="flex min-w-0 items-center cursor-pointer select-none bg-transparent border-none p-0 w-auto text-left font-[inherit] text-[inherit] focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2 focus-visible:rounded"
                      style={{ gridArea: "group", cursor: hasDetails ? "pointer" : "default" }}
                      type="button"
                      onClick={() => { if (hasDetails) toggleGroup(p.project_id); }}
                      aria-expanded={isOpen}
                    >
                      <span className="inline-flex min-w-0 items-center gap-1.5">
                        <span className="inline-flex min-w-0 items-center gap-1 font-semibold text-foreground">
                          <GroupLabel text={name} shortText={`Group ${p.group_no}`} />
                          {hasDetails && (
                            <span className={cn("inline-flex shrink-0 items-center text-muted-foreground transition-transform duration-200", isOpen && "rotate-180 text-foreground")} aria-hidden="true">
                              <ChevronDownIcon />
                            </span>
                          )}
                        </span>
                      </span>
                    </button>
                    <span
                      className="flex items-center justify-end gap-1 text-[11px] text-muted-foreground whitespace-nowrap tabular-nums"
                      style={{ gridArea: "ts", justifySelf: "end" }}
                      title={timestamp}
                    >
                      <span className="[&_svg]:size-3" aria-hidden="true"><HistoryIcon /></span>
                      <span className="whitespace-nowrap text-right">{timestamp}</span>
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold whitespace-nowrap [&_svg]:size-3",
                        resolveStatusBadgeColor(chip.colorClass)
                      )}
                      style={{ gridArea: "pill", justifySelf: "end" }}
                    >
                      {chip.icon}
                      {chip.label}
                    </span>
                    <span
                      className={cn(
                        "text-right font-mono text-[15px] font-bold tabular-nums min-w-[2ch]",
                        chip.tone === "scored" && "text-emerald-600",
                        chip.tone === "partial" && "text-amber-600",
                        chip.tone === "empty" && "text-muted-foreground",
                        !["scored", "partial", "empty"].includes(chip.tone) && "text-slate-600"
                      )}
                      style={{ gridArea: "score", justifySelf: "end" }}
                    >
                      {total !== "—" ? `${total}` : "—"}
                    </span>
                  </div>

                  {hasDetails && (
                    <div className={cn(
                      "grid transition-[grid-template-rows,opacity] duration-200 mt-0",
                      isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                    )}>
                      <div className="overflow-hidden mt-0.5 grid gap-1 pl-0">
                        {p.project_title && (
                          <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                            <ProjectTitle text={p.project_title} />
                          </div>
                        )}
                        {students.length > 0 && (
                          <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                            <StudentNames names={students} />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            </>
          ) : (
            <div className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-[13px] text-muted-foreground">
              <span className="inline-flex shrink-0 items-center [&_svg]:size-3.5" aria-hidden="true">
                <InfoIcon />
              </span>
              <span>You have not started any evaluations yet.</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <button className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 sm:h-11" onClick={hasData ? onConfirm : onFresh}>
            {allSubmitted && editAllowed && (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pencil-icon lucide-pencil" aria-hidden="true"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg>
            )}
            {allSubmitted
              ? (editAllowed ? "Edit My Scores" : "Done")
              : hasData ? "Resume Evaluation →" : "Start Evaluation →"}
          </button>
        </div>

          </div>
        </div>
      )}
    </>
  );
}
