// src/admin/settings/JuryRevokeConfirmDialog.jsx
import { useRef } from "react";
import { BanIcon } from "../../shared/Icons";
import { useFocusTrap } from "../../shared/useFocusTrap";
import AlertCard from "../../shared/AlertCard";

export default function JuryRevokeConfirmDialog({
  open,
  loading,
  activeJurorCount = 0,
  onCancel,
  onConfirm,
}) {
  const containerRef = useRef(null);
  useFocusTrap({ containerRef, isOpen: !!open, onClose: onCancel });

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[400] grid place-items-center bg-slate-900/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="jury-revoke-dialog-title"
    >
      <div
        className="relative flex w-[min(520px,92vw)] max-w-[100vw] max-h-[90vh] flex-col gap-3 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.12),0_0_0_1px_rgba(15,23,42,0.08)]"
        ref={containerRef}
      >
        {/* Header */}
        <div className="flex items-center gap-2.5 text-slate-900">
          <span
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-red-200 bg-rose-50 text-red-600 [&_svg]:h-[18px] [&_svg]:w-[18px]"
            aria-hidden="true"
          >
            <BanIcon />
          </span>
          <div
            className="text-lg font-bold tracking-tight"
            id="jury-revoke-dialog-title"
          >
            Revoke Access
          </div>
        </div>

        {/* Body */}
        <div className="mt-0.5 flex flex-col gap-2.5">
          <div className="text-[13px] leading-snug text-slate-600">
            Are you sure you want to revoke jury entry access?
          </div>
          <AlertCard variant="error" icon={BanIcon}>
            <ul style={{ margin: 0, paddingLeft: "1.2rem", textAlign: "left" }}>
              <li>New scans of the current QR code will be <strong>blocked immediately</strong>.</li>
              <li>All evaluations will be <strong>locked</strong> — active jurors will no longer be able to submit scores.</li>
            </ul>
          </AlertCard>
          {activeJurorCount > 0 && (
            <AlertCard variant="warning">
              <strong>{activeJurorCount}</strong> juror{activeJurorCount !== 1 ? "s are" : " is"} currently
              active and will be locked from further edits.
            </AlertCard>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2.5">
          <button
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-transparent px-3.5 py-2 text-[13px] font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600/20 disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            disabled={loading}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-600 bg-red-600 px-3.5 py-2 text-[13px] font-semibold text-white shadow-sm transition-all hover:bg-red-700 hover:border-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600/30 disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            disabled={loading}
            onClick={onConfirm}
          >
            {loading ? "Revoking..." : "Revoke Access"}
          </button>
        </div>
      </div>
    </div>
  );
}
