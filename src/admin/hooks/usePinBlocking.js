// src/admin/hooks/usePinBlocking.js
// ============================================================
// Manages PIN lockout state: load locked jurors, unlock handler.
// Threshold: 3 failed attempts → 15m auto-lock (DB value).
// ============================================================

import { useCallback, useState } from "react";
import { listLockedJurors, unlockJurorPin } from "../../shared/api";
import { useToast } from "@/shared/hooks/useToast";

export function usePinBlocking({ periodId }) {
  const _toast = useToast();
  const [lockedJurors, setLockedJurors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadLockedJurors = useCallback(async () => {
    if (!periodId) return;
    setLoading(true);
    setError("");
    try {
      const rows = await listLockedJurors({ periodId });
      setLockedJurors(rows || []);
    } catch (e) {
      setError(e?.message || "Could not load locked jurors.");
    } finally {
      setLoading(false);
    }
  }, [periodId]);

  const handleUnlock = useCallback(async (jurorId) => {
    if (!jurorId || !periodId) return;
    try {
      await unlockJurorPin({ jurorId, periodId });
      setLockedJurors((prev) => prev.filter((j) => j.jurorId !== jurorId));
      _toast.success("Juror unlocked");
    } catch (e) {
      _toast.error(e?.message || "Could not unlock juror.");
    }
  }, [periodId, _toast]);

  const handleUnlockAll = useCallback(async () => {
    if (!periodId || lockedJurors.length === 0) return;
    const toUnlock = [...lockedJurors];
    let failed = 0;
    for (const j of toUnlock) {
      try {
        await unlockJurorPin({ jurorId: j.jurorId, periodId });
        setLockedJurors((prev) => prev.filter((r) => r.jurorId !== j.jurorId));
      } catch {
        failed += 1;
      }
    }
    if (failed === 0) {
      _toast.success(`Unlocked ${toUnlock.length} juror${toUnlock.length !== 1 ? "s" : ""}`);
    } else {
      _toast.error(`Unlocked ${toUnlock.length - failed}, failed ${failed}`);
    }
  }, [periodId, lockedJurors, _toast]);

  return {
    lockedJurors,
    loading,
    error,
    loadLockedJurors,
    handleUnlock,
    handleUnlockAll,
  };
}
