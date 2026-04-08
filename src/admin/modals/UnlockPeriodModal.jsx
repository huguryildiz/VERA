// src/admin/modals/UnlockPeriodModal.jsx
// Modal: confirm unlocking an evaluation period.
// Warning layout — reversible action, no typed confirmation required.
//
// Props:
//   open     — boolean
//   onClose  — () => void
//   period   — { id, name }
//   onUnlock — () => Promise<void>

import { useState, useEffect } from "react";
import { AlertCircle, LockOpen } from "lucide-react";
import Modal from "@/shared/ui/Modal";
import AsyncButtonContent from "@/shared/ui/AsyncButtonContent";

export default function UnlockPeriodModal({ open, onClose, period, onUnlock }) {
  const [unlocking, setUnlocking] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setConfirmName("");
    setError("");
  }, [open]);

  const handleClose = () => {
    setConfirmName("");
    setError("");
    onClose();
  };

  const handleUnlock = async () => {
    setError("");
    setUnlocking(true);
    try {
      await onUnlock?.();
      setConfirmName("");
      onClose();
    } catch (e) {
      setError(e?.message || "Could not unlock the period. Try again.");
    } finally {
      setUnlocking(false);
    }
  };

  const canUnlock = confirmName === period?.name;

  return (
    <Modal open={open} onClose={handleClose} size="sm" centered>
      <div className="fs-modal-header">
        <div className="fs-modal-icon danger">
          <LockOpen size={22} />
        </div>
        <div className="fs-title" style={{ textAlign: "center" }}>Unlock Evaluation Period?</div>
        <div className="fs-subtitle" style={{ textAlign: "center", marginTop: 4 }}>
          <strong style={{ color: "var(--text-primary)" }}>{period?.name}</strong>{" "}
          will be unlocked and jurors can resume submitting evaluations.
        </div>
      </div>

      <div className="fs-modal-body" style={{ paddingTop: 2 }}>
        {error && (
          <div className="fs-alert danger" style={{ marginBottom: 12, textAlign: "left" }}>
            <div className="fs-alert-icon"><AlertCircle size={15} /></div>
            <div className="fs-alert-body">{error}</div>
          </div>
        )}

        <div>
          <label style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>
            Type <strong style={{ color: "var(--text-primary)" }}>{period?.name}</strong> to confirm
          </label>
          <input
            className="fs-typed-input"
            type="text"
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            placeholder={period?.name ? `Type ${period.name} to confirm` : "Type the period name to confirm"}
            autoComplete="off"
            spellCheck={false}
            disabled={unlocking}
          />
        </div>
      </div>

      <div
        className="fs-modal-footer"
        style={{ justifyContent: "center", background: "transparent", borderTop: "none", paddingTop: 0 }}
      >
        <button
          type="button"
          className="fs-btn fs-btn-secondary"
          onClick={handleClose}
          disabled={unlocking}
          style={{ flex: 1 }}
        >
          Cancel
        </button>
        <button
          type="button"
          className="fs-btn fs-btn-danger"
          onClick={handleUnlock}
          disabled={unlocking || !canUnlock}
          style={{ flex: 1 }}
        >
          <AsyncButtonContent loading={unlocking} loadingText="Unlocking…">
            Unlock Period
          </AsyncButtonContent>
        </button>
      </div>
    </Modal>
  );
}
