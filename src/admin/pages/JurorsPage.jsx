// src/admin/pages/JurorsPage.jsx
// Standalone page for juror management, PIN resets, and edit-mode control.
// Initializes its own domain hooks directly (bypasses useSettingsCrud).

import { useCallback, useEffect, useState } from "react";
import { useToast } from "../../components/toast/useToast";
import { useManageSemesters } from "../hooks/useManageSemesters";
import { useManageProjects } from "../hooks/useManageProjects";
import { useManageJurors } from "../hooks/useManageJurors";
import { useDeleteConfirm, buildCountSummary } from "../hooks/useDeleteConfirm";
import { usePageRealtime } from "../hooks/usePageRealtime";
import ConfirmDialog from "../../shared/ConfirmDialog";
import PinResetDialog from "../settings/PinResetDialog";
import ManageJurorsPanel from "../ManageJurorsPanel";
import PageShell from "./PageShell";

export default function JurorsPage({
  tenantId,
  selectedSemesterId,
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

  // ── Semester context ──
  const semesters = useManageSemesters({
    tenantId,
    selectedSemesterId,
    setMessage,
    incLoading,
    decLoading,
    onCurrentSemesterChange,
    setPanelError: () => {},
    clearPanelError: () => {},
  });

  // Load semesters on mount
  useEffect(() => {
    semesters.loadSemesters().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [semesters.loadSemesters]);

  // ── Projects (needed for juror enrichment — total_projects count) ──
  const projectsHook = useManageProjects({
    tenantId,
    viewSemesterId: semesters.viewSemesterId,
    viewSemesterLabel: semesters.viewSemesterLabel,
    semesterList: semesters.semesterList,
    setMessage: () => {},
    incLoading: () => {},
    decLoading: () => {},
    setPanelError: () => {},
    clearPanelError: () => {},
  });

  // ── Jurors ──
  const jurors = useManageJurors({
    tenantId,
    viewSemesterId: semesters.viewSemesterId,
    viewSemesterLabel: semesters.viewSemesterLabel,
    projects: projectsHook.projects,
    setMessage,
    incLoading,
    decLoading,
    setPanelError,
    clearPanelError,
    setEvalLockError: semesters.setEvalLockError,
  });

  // Load projects + jurors when viewSemesterId changes
  useEffect(() => {
    if (!semesters.viewSemesterId || !tenantId) return;
    incLoading();
    Promise.allSettled([
      projectsHook.loadProjects(semesters.viewSemesterId),
      jurors.loadJurors(),
    ])
      .then((results) => {
        if (results[1].status === "rejected") {
          setPanelError("jurors", "Could not load jurors.");
        }
      })
      .finally(() => decLoading());

    // Deferred enrichment
    const enrichTimer = setTimeout(() => {
      jurors.enrichJurorScores().catch(() => {});
    }, 100);
    return () => clearTimeout(enrichTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [semesters.viewSemesterId, tenantId]);

  // ── Delete confirmation ──
  const deleteConfirm = useDeleteConfirm({
    tenantId,
    setMessage,
    clearAllPanelErrors: clearPanelError,
    onJurorDeleted: jurors.removeJuror,
    onSemesterDeleted: () => {},
    onProjectDeleted: () => {},
  });

  // ── Realtime ──
  usePageRealtime({
    tenantId,
    channelName: "jurors-page-live",
    subscriptions: [
      { table: "jurors", event: "*", onPayload: jurors.scheduleJurorRefresh },
      { table: "juror_semester_auth", event: "*", onPayload: jurors.scheduleJurorRefresh },
      { table: "scores", event: "*", onPayload: jurors.scheduleJurorRefresh },
    ],
    deps: [jurors.scheduleJurorRefresh],
  });

  return (
    <PageShell
      title="Jurors"
      description="Manage jury members and evaluation permissions"
    >
      <PinResetDialog
        pinResetTarget={jurors.pinResetTarget}
        resetPinInfo={jurors.resetPinInfo}
        pinResetLoading={jurors.pinResetLoading}
        pinCopied={jurors.pinCopied}
        viewSemesterLabel={semesters.viewSemesterLabel}
        onCopyPin={jurors.handleCopyPin}
        onClose={jurors.closeResetPinDialog}
        onConfirmReset={jurors.confirmResetPin}
      />
      <ConfirmDialog
        open={!!deleteConfirm.deleteTarget}
        onOpenChange={(open) => {
          if (!open) {
            deleteConfirm.setDeleteTarget(null);
            deleteConfirm.setDeleteCounts(null);
          }
        }}
        title="Delete Confirmation"
        body={
          deleteConfirm.deleteTarget ? (
            <>
              <strong>{deleteConfirm.deleteTarget.label || "Selected record"}</strong>
              {deleteConfirm.deleteTarget.inst && (
                <span> ({deleteConfirm.deleteTarget.inst})</span>
              )}
              {" will be deleted. Are you sure?"}
            </>
          ) : ""
        }
        warning={buildCountSummary(deleteConfirm.deleteCounts) || "This action cannot be undone."}
        typedConfirmation={deleteConfirm.deleteTarget?.typedConfirmation || undefined}
        confirmLabel="Delete"
        tone="danger"
        onConfirm={async () => {
          if (isDemoMode) throw new Error("Demo mode: delete is disabled.");
          try {
            await deleteConfirm.handleConfirmDelete();
          } catch (e) {
            throw new Error(deleteConfirm.mapDeleteError(e));
          }
        }}
      />

      <ManageJurorsPanel
        jurors={jurors.jurors}
        semesterList={semesters.semesterList}
        panelError={panelError}
        isDemoMode={isDemoMode}
        isMobile={false}
        isOpen={true}
        onToggle={() => {}}
        onDirtyChange={onDirtyChange}
        onImport={jurors.handleImportJurors}
        onAddJuror={jurors.handleAddJuror}
        onEditJuror={jurors.handleEditJuror}
        onResetPin={jurors.requestResetPin}
        onDeleteJuror={(j) =>
          deleteConfirm.handleRequestDelete({
            type: "juror",
            id: j?.jurorId || j?.juror_id,
            label: `Juror ${j?.juryName || j?.juror_name || ""}`.trim(),
            name: j?.juryName || j?.juror_name || "",
            inst: j?.juryDept || j?.juror_inst || "",
          })
        }
        settings={semesters.settings}
        currentSemesterId={semesters.viewSemesterId}
        currentSemesterName={semesters.viewSemesterLabel}
        onToggleEdit={jurors.handleToggleJurorEdit}
        onForceCloseEdit={jurors.handleForceCloseJurorEdit}
      />
    </PageShell>
  );
}
