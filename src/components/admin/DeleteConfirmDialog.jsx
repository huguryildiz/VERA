// src/components/admin/DeleteConfirmDialog.jsx

import { useEffect, useState } from "react";

export default function DeleteConfirmDialog({
  open,
  onOpenChange,
  targetLabel,
  onConfirm,
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPassword("");
    setError("");
    setLoading(false);
  }, [open]);

  if (!open) return null;

  const handleClose = () => {
    if (loading) return;
    onOpenChange?.(false);
  };

  const handleConfirm = async () => {
    const value = password.trim();
    if (!value) {
      setError("Delete password is required.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await onConfirm?.(value);
      onOpenChange?.(false);
    } catch (e) {
      setError(e?.message || "Could not delete. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="manage-modal" role="dialog" aria-modal="true">
      <div className="manage-modal-card">
        <div className="manage-modal-title">Delete Confirmation</div>
        <div className="manage-modal-body">
          <div className="manage-hint">Enter the delete password to confirm.</div>
          {targetLabel && (
            <div className="manage-hint"><strong>{targetLabel}</strong></div>
          )}
          <div className="manage-field">
            <label className="manage-label">Delete Password</label>
            <input
              type="password"
              className="manage-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
            {error && <div className="manage-field-error">{error}</div>}
          </div>
        </div>
        <div className="manage-modal-actions">
          <button className="manage-btn" type="button" onClick={handleClose} disabled={loading}>
            Cancel
          </button>
          <button
            className="manage-btn danger"
            type="button"
            onClick={handleConfirm}
            disabled={!password.trim() || loading}
          >
            {loading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
