// src/jury/ScoringGrid.jsx
// ============================================================
// Criterion input cards + comment box + total bar + submit buttons.
// Receives all score state and handlers as props from EvalStep.
// ============================================================

import { memo, useState } from "react";
import { CRITERIA, MUDEK_OUTCOMES } from "../config";
import { ChevronDownIcon, TriangleAlertIcon } from "../shared/Icons";
import LevelPill, { isKnownBandVariant, getBandPositionStyle, getBandScoreRank } from "../shared/LevelPill";
import { cn } from "../lib/utils";

function parseScoreInput(raw, max) {
  if (raw === "" || raw === null || raw === undefined) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return null;
  if (n < 0 || n > max) return null;
  return n;
}

function getRubricRangeBounds(rubricRow) {
  const min = Number(rubricRow?.min);
  const max = Number(rubricRow?.max);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  return { min, max };
}

const ScoringGrid = memo(function ScoringGrid({
  pid,
  scoresPid,
  commentsPid,
  touchedPid,
  lockActive,
  handleScore,
  handleScoreBlur,
  handleCommentChange,
  handleCommentBlur,
  totalScore,
  allComplete,
  editMode,
  completedGroups,
  totalGroups,
  handleFinalSubmit,
  criteria = CRITERIA,
  mudekLookup,
}) {
  const [openRubric, setOpenRubric] = useState(null);

  const updateDescScrollState = (el) => {
    if (!el) return;
    const hasOverflow = el.scrollWidth > el.clientWidth;
    el.classList.toggle("has-overflow", hasOverflow);
    el.classList.toggle("is-scrolled", el.scrollLeft > 0);
  };
  const handleDescScroll = (e) => updateDescScrollState(e.currentTarget);

  return (
    <>
      {/* Criterion cards */}
      {criteria.map((crit) => {
        const cid         = crit.id ?? crit.key;
        const val         = scoresPid?.[cid] ?? "";
        const showMissing = touchedPid?.[cid] && (val === "" || val == null);
        const barPct      = ((parseInt(val, 10) || 0) / crit.max) * 100;
        const numericScore = parseScoreInput(val, crit.max);
        const isInvalid   = !lockActive && showMissing;

        return (
          <div
            key={cid}
            className={cn(
              "rounded-2xl border border-border/60 border-l-4 p-[var(--crit-pad)] shadow-md transition-[box-shadow,transform] duration-200",
              "bg-slate-50 [--crit-pad:16px]",
              "[@media(hover:hover)]:hover:shadow-lg [@media(hover:hover)]:hover:-translate-y-0.5",
              openRubric === cid && "bg-slate-100",
              isInvalid && "border border-red-500/45 bg-red-50/70",
              lockActive && "opacity-90"
            )}
            style={crit.color ? { borderLeftColor: crit.color } : { borderLeftColor: "#94a3b8" }}
          >
            <div className="flex flex-col items-stretch gap-1.5 mb-3">
              <div className="flex items-start justify-between gap-4 w-full">
                <div className={cn(
                  "text-[15px] font-bold text-foreground",
                  isInvalid && "text-red-800",
                  lockActive && "text-slate-500"
                )}>
                  {crit.label}
                  {Array.isArray(crit.mudek) && crit.mudek.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {crit.mudek.map((code) => {
                        const entry = Object.values(mudekLookup || {}).find((o) => o.code === code);
                        const descEn = entry?.desc_en || MUDEK_OUTCOMES[code]?.en || "";
                        const descTr = entry?.desc_tr || "";
                        return (
                          <div key={code} className="group relative">
                            <span className="inline-flex cursor-help rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 transition-colors group-hover:bg-blue-200 group-hover:text-blue-800">{code}</span>
                            <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-max max-w-[240px] -translate-x-1/2 rounded-lg border bg-popover p-2 text-xs shadow-md opacity-0 transition-opacity group-hover:opacity-100">
                              <span className="block font-bold text-popover-foreground">{code}</span>
                              {descEn && <span className="mt-0.5 block text-muted-foreground">🇬🇧 {descEn}</span>}
                              {descTr && <span className="mt-0.5 block text-muted-foreground">🇹🇷 {descTr}</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <button
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border border-blue-500 bg-slate-50 px-3 py-1.5",
                    "text-xs font-semibold text-blue-500 whitespace-nowrap flex-shrink-0 ml-2",
                    "shadow-sm outline-none cursor-pointer",
                    "transition-[transform,border-color,box-shadow] duration-150",
                    "hover:bg-blue-50 hover:border-blue-600 hover:shadow-md",
                    "active:scale-95",
                    "focus-visible:ring-2 focus-visible:ring-blue-500/30",
                    openRubric === cid && "bg-blue-50 border-blue-600 shadow-md"
                  )}
                  onClick={() => setOpenRubric(openRubric === cid ? null : cid)}
                  aria-label={`View rubric for ${crit.label}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" className="w-4 h-4 stroke-current stroke-2 fill-none flex-shrink-0">
                    <path d="M16 5H3" />
                    <path d="M16 12H3" />
                    <path d="M11 19H3" />
                    <path d="m15 18 2 2 4-4" />
                  </svg>
                  View Rubric
                  <span className={cn(
                    "inline-flex transition-transform duration-200",
                    openRubric === cid && "rotate-180"
                  )}>
                    <ChevronDownIcon />
                  </span>
                </button>
              </div>
              <div className={cn(
                "text-xs mt-0.5",
                lockActive ? "text-slate-400" : "text-muted-foreground"
              )}>
                Maximum: {crit.max} pts
              </div>
              {crit.blurb && (
                <div className="text-xs text-slate-400 mt-1.5 leading-[1.45] w-full max-w-full whitespace-normal overflow-visible text-justify break-words">
                  {crit.blurb}
                </div>
              )}
            </div>

            {openRubric === cid && Array.isArray(crit.rubric) && (
              <div className="rounded-lg bg-muted/50 overflow-hidden mb-3 border border-border">
                {crit.rubric.map((r) => {
                  const bounds = getRubricRangeBounds(r);
                  const isActive = Boolean(
                    bounds &&
                    numericScore !== null &&
                    numericScore >= bounds.min &&
                    numericScore <= bounds.max
                  );
                  const pillStyle = isKnownBandVariant(r.level)
                    ? undefined
                    : getBandPositionStyle(getBandScoreRank(crit.rubric, r), crit.rubric.length);
                  return (
                    <div
                      key={r.range}
                      className={cn(
                        "grid grid-cols-[60px_140px_minmax(0,1fr)] gap-2 px-3 py-2 border border-transparent border-b-border text-[12.5px] items-start min-w-0 relative transition-[background-color,border-color] duration-150",
                        "last:border-b-0",
                        isActive && "bg-green-50 border-green-300 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3px] before:bg-green-500"
                      )}
                      data-min={bounds?.min}
                      data-max={bounds?.max}
                    >
                      <div className="font-mono font-medium text-blue-500">{r.range}</div>
                      <LevelPill variant={r.level} style={pillStyle}>{r.level}</LevelPill>
                      <div className="text-muted-foreground leading-[1.4] min-w-0 break-words text-justify">{r.desc}</div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex items-center gap-3">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={val}
                onChange={(e) => handleScore(pid, cid, e.target.value)}
                onBlur={() => handleScoreBlur(pid, cid)}
                placeholder="—"
                className={cn(
                  "w-[72px] p-2.5 border border-border rounded-xl text-lg font-bold text-center font-mono outline-none flex-shrink-0 bg-white",
                  "focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)]",
                  "disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed disabled:border-dashed disabled:border-slate-300"
                )}
                disabled={lockActive}
                aria-label={`Score for ${crit.label}, max ${crit.max}`}
              />
              <span className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                <span
                  className="block h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-[width] duration-300 ease-out"
                  style={{ width: `${barPct}%` }}
                />
              </span>
              <span className={cn(
                "font-mono text-[13px] font-medium text-muted-foreground min-w-[60px] text-right",
                lockActive && "text-slate-400"
              )}>
                {val !== "" && val != null ? `${val} / ${crit.max}` : `— / ${crit.max}`}
              </span>
            </div>

            {!lockActive && showMissing && (
              <div className="mt-2 text-xs text-red-700/90 flex items-center gap-2 [&_svg]:w-3.5 [&_svg]:h-3.5">
                <TriangleAlertIcon />
                Required
              </div>
            )}
          </div>
        );
      })}

      {/* Comments */}
      <div className="rounded-2xl border border-border/60 border-l-4 p-[var(--crit-pad)] shadow-md bg-slate-50 [--crit-pad:16px] mt-3" style={{ borderLeftColor: "#94a3b8" }}>
        <div className="text-[15px] font-bold text-foreground">Comments (Optional)</div>
        <textarea
          value={commentsPid || ""}
          onChange={(e) => handleCommentChange(pid, e.target.value)}
          onBlur={() => handleCommentBlur(pid)}
          placeholder="Optional feedback on the project, presentation, or teamwork."
          rows={3}
          disabled={lockActive}
          aria-label="Comments for this group"
          className={cn(
            "w-full px-3 py-2.5 border border-border rounded-xl text-[13px] resize-y outline-none mt-2.5 text-foreground bg-white",
            "placeholder:text-slate-400",
            "focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)]",
            "disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed disabled:border-dashed disabled:border-slate-300"
          )}
        />
      </div>

      {/* Running total */}
      <div className="flex justify-between items-center gap-2.5 rounded-2xl bg-blue-500/[0.07] border border-blue-500/[0.22] px-[18px] py-3.5 font-semibold">
        <span className="text-xl font-mono font-bold text-[#3b5bdb] uppercase tracking-wide">Total</span>
        <span className={cn(
          "text-xl font-mono font-bold text-[var(--brand-600)]",
          totalScore >= 80 && "text-green-600",
          totalScore >= 60 && totalScore < 80 && "text-amber-600"
        )}>
          {totalScore} / 100
        </span>
      </div>

      {/* Submit All — normal mode, all filled */}
      {allComplete && !editMode && (
        <button
          className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4"
          onClick={handleFinalSubmit}
          disabled={lockActive}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-clipboard-pen-line-icon lucide-clipboard-pen-line" aria-hidden="true">
            <rect width="8" height="4" x="8" y="2" rx="1" />
            <path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-.5" />
            <path d="M16 4h2a2 2 0 0 1 1.73 1" />
            <path d="M8 18h1" />
            <path d="M21.378 12.626a1 1 0 0 0-3.004-3.004l-4.01 4.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z" />
          </svg>
          Submit All Evaluations
        </button>
      )}

      {/* Submit Final — edit mode only */}
      {editMode && (
        <button
          className={cn(
            "mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md py-3 text-sm font-semibold text-white transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4",
            allComplete ? "bg-emerald-600 hover:bg-emerald-700" : "bg-amber-600 hover:bg-amber-700"
          )}
          onClick={handleFinalSubmit}
          disabled={lockActive || !allComplete}
        >
          {allComplete ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-send-icon lucide-send" aria-hidden="true">
              <path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z" />
              <path d="m21.854 2.147-10.94 10.939" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-clipboard-pen-line-icon lucide-clipboard-pen-line" aria-hidden="true">
              <rect width="8" height="4" x="8" y="2" rx="1" />
              <path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-.5" />
              <path d="M16 4h2a2 2 0 0 1 1.73 1" />
              <path d="M8 18h1" />
              <path d="M21.378 12.626a1 1 0 0 0-3.004-3.004l-4.01 4.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z" />
            </svg>
          )}
          {allComplete
            ? "Submit Final Scores"
            : `Complete Required Scores (${completedGroups}/${totalGroups})`}
        </button>
      )}
    </>
  );
});

export default ScoringGrid;
