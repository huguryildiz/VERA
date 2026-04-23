import { Network } from "lucide-react";
import Modal from "@/shared/ui/Modal";
import AsyncButtonContent from "@/shared/ui/AsyncButtonContent";

export default function ImportConfirmModal({
  open,
  proposedName,
  saving,
  onCancel,
  onConfirm,
}) {
  return (
    <Modal
      open={open}
      onClose={() => { if (!saving) onCancel(); }}
      size="sm"
      centered
    >
      <div className="fs-modal-header">
        <div className="fs-modal-icon warning">
          <Network size={22} strokeWidth={2} />
        </div>
        <div className="fs-title" style={{ textAlign: "center" }}>Replace Outcome Set?</div>
        <div className="fs-subtitle" style={{ textAlign: "center", marginTop: 4 }}>
          You are about to replace this period's outcome set with{" "}
          <strong style={{ color: "var(--text-primary)" }}>
            {proposedName || "a new framework"}
          </strong>.
        </div>
      </div>
      <div className="fs-modal-footer" style={{ justifyContent: "center", background: "transparent", borderTop: "none", paddingTop: 0 }}>
        <button
          type="button"
          className="fs-btn fs-btn-secondary"
          onClick={onCancel}
          disabled={saving}
          style={{ flex: 1 }}
        >
          Cancel
        </button>
        <button
          type="button"
          className="fs-btn fs-btn-primary"
          onClick={onConfirm}
          disabled={saving}
          style={{ flex: 1 }}
        >
          <AsyncButtonContent loading={saving} loadingText="Replacing…">
            Replace Outcomes
          </AsyncButtonContent>
        </button>
      </div>
    </Modal>
  );
}
