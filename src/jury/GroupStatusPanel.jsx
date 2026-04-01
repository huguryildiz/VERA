// src/jury/GroupStatusPanel.jsx
// ============================================================
// Status banners shown at the top of the EvalStep body:
//   - Group synced (all scores saved)
//   - Edit mode active
//   - Lock (read-only)
//   - Save error + Retry
// ============================================================

import { memo } from "react";
import { CheckCircle2Icon, PencilIcon, LockIcon, TriangleAlertIcon } from "../shared/Icons";

const GroupStatusPanel = memo(function GroupStatusPanel({
  pid,
  groupSynced,
  editMode,
  lockActive,
  saveStatus,
  onRetry,
}) {
  return (
    <>
      {groupSynced[pid] && !editMode && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 [&_svg]:size-3.5 dark:border-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300">
          <CheckCircle2Icon />
          All scores saved for this group.
        </div>
      )}
      {editMode && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 [&_svg]:size-3.5 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-300">
          <PencilIcon />
          Edit mode enabled — adjust scores and click &ldquo;Submit Final Scores&rdquo; when ready.
        </div>
      )}
      {lockActive && (
        <div className="flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800 [&_svg]:size-3.5 dark:border-orange-800 dark:bg-orange-950/20 dark:text-orange-300">
          <LockIcon />
          Your evaluations are locked. Contact the administrator to request changes.
        </div>
      )}
      {saveStatus === "error" && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 [&_svg]:size-3.5 dark:border-red-800 dark:bg-red-950/20 dark:text-red-300">
          <TriangleAlertIcon />
          Could not save. Check your connection.
          <button
            className="ml-auto rounded border border-red-400 bg-transparent px-2.5 py-0.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 dark:border-red-600 dark:text-red-400 dark:hover:bg-red-950/30"
            onClick={() => onRetry(pid)}
          >
            Retry
          </button>
        </div>
      )}
    </>
  );
});

export default GroupStatusPanel;
