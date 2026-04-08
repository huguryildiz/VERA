// src/admin/modals/LockPeriodModal.jsx
// Modal: confirm locking an evaluation period.
// Danger layout with typed confirmation — irreversible scoring freeze.
//
// Props:
//   open    — boolean
//   onClose — () => void
//   period  — { id, name }
//   onLock  — () => Promise<void>

import { useState, useEffect } from "react";
import { AlertCircle, Lock } from "lucide-react";
import Modal from "@/shared/ui/Modal";
import AsyncButtonContent from "@/shared/ui/AsyncButtonContent";

export default function LockPeriodModal({ open, onClose, period, onLock }) {
  const [locking, setLocking] = useState(false);
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

  const handleLock = async () => {
    setError("");
    setLocking(true);
    try {
      await onLock?.();
      setConfirmName("");
      onClose();
    } catch (e) {
      setError(e?.message || "Could not lock the period. Try again.");
    } finally {
      setLocking(false);
    }
  };

  const canLock = confirmName === period?.name;

  return (
    <Modal open={open} onClose={handleClose} size="sm" centered>
      <div className="fs-modal-header">
        <div className="fs-modal-icon danger">
          <Lock size={22} />
        </div>
        <div className="fs-title" style={{ textAlign: "center" }}>Lock Evaluation Period?</div>
        <div className="fs-subtitle" style={{ textAlign: "center", marginTop: 4 }}>
          <strong style={{ color: "var(--text-primary)" }}>{period?.name}</strong>{" "}
          will be locked. All scores are finalized and the period becomes read-only.
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
            disabled={locking}
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
          disabled={locking}
          style={{ flex: 1 }}
        >
          Cancel
        </button>
        <button
          type="button"
          className="fs-btn fs-btn-danger"
          onClick={handleLock}
          disabled={locking || !canLock}
          style={{ flex: 1 }}
        >
          <AsyncButtonContent loading={locking} loadingText="Locking…">
            Lock Period
          </AsyncButtonContent>
        </button>
      </div>
    </Modal>
  );
}
