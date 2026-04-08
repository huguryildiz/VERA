// src/admin/drawers/EditSingleCriterionDrawer.jsx
// Single-criterion editor drawer with weight budget indicator.
// Opens from CriteriaPage row actions ("Edit") or "Add Criterion" button.

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { Check, AlertCircle, X, Plus, Pencil, Lock, ChevronRight } from "lucide-react";
import Drawer from "@/shared/ui/Drawer";
import AlertCard from "@/shared/ui/AlertCard";
import InlineError from "@/shared/ui/InlineError";
import { RUBRIC_EDITOR_TEXT } from "../../shared/constants";
import { validateCriterion } from "../../shared/criteriaValidation";
import { criterionToConfig } from "../../shared/criteria/criteriaHelpers";
import {
  templateToRow,
  emptyRow,
  clampRubricBandsToCriterionMax,
  defaultRubricBands,
  getConfigRubricSeed,
} from "../criteria/criteriaFormHelpers";
import OutcomePillSelector from "../criteria/OutcomePillSelector";
import RubricBandEditor from "../criteria/RubricBandEditor";

export default function EditSingleCriterionDrawer({
  open,
  onClose,
  period,
  criterion,        // null → add new, object → edit existing
  editIndex,        // index in criteriaConfig; -1 or null → add
  criteriaConfig,   // full criteria array (stored shape)
  outcomeConfig,
  onSave,
  disabled,
  isLocked,
}) {
  const isNew = editIndex == null || editIndex < 0;
  const formRef = useRef(null);
  const saveBtnRef = useRef(null);

  // ── Form state ──────────────────────────────────────────────
  const [row, setRowState] = useState(() =>
    criterion ? templateToRow(criterion, 0) : emptyRow(criteriaConfig || [])
  );
  const [saveAttempted, setSaveAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [touched, setTouched] = useState({});
  const [rubricOpen, setRubricOpen] = useState(false);
  const [outcomeOpen, setOutcomeOpen] = useState(false);

  // Reset when drawer opens with a new target
  useEffect(() => {
    if (open) {
      const newRow = criterion
        ? templateToRow(criterion, 0)
        : emptyRow(criteriaConfig || []);
      setRowState(newRow);
      setSaveAttempted(false);
      setSaving(false);
      setSaveError("");
      setTouched({});
      setRubricOpen(!!criterion?.rubric?.length);
      setOutcomeOpen(false);
    }
  }, [open, editIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Budget ──────────────────────────────────────────────────
  const otherTotal = useMemo(
    () =>
      (criteriaConfig || []).reduce(
        (sum, c, i) => (!isNew && i === editIndex ? sum : sum + (Number(c.max) || 0)),
        0
      ),
    [criteriaConfig, editIndex, isNew]
  );

  const currentMax = Number(row.max) || 0;
  const newTotal = otherTotal + currentMax;
  const available = 100 - otherTotal;

  // ── Outcome helpers ─────────────────────────────────────────
  const outcomeCodes = useMemo(
    () => new Set((outcomeConfig || []).map((o) => o.code)),
    [outcomeConfig]
  );
  const sanitizeOutcomes = useCallback(
    (sel = []) =>
      Array.isArray(sel) ? sel.filter((c) => outcomeCodes.has(c)) : [],
    [outcomeCodes]
  );

  // ── Validation ──────────────────────────────────────────────
  const allRows = useMemo(() => {
    if (isNew) return [...(criteriaConfig || []), row];
    return (criteriaConfig || []).map((c, i) => (i === editIndex ? row : c));
  }, [criteriaConfig, editIndex, isNew, row]);

  const rowIndex = isNew ? allRows.length - 1 : editIndex;
  const { errors: fieldErrors, rubricErrors } = validateCriterion(
    row,
    allRows,
    outcomeConfig,
    rowIndex
  );

  const showError = (field) =>
    (saveAttempted || touched[field]) && fieldErrors[field];

  const fullyLocked = isLocked || disabled;

  // ── Field setters ───────────────────────────────────────────
  const setField = useCallback((field, value) => {
    let finalValue = value;
    if (field === "max" && value !== "") {
      const n = Number(value);
      if (!isNaN(n)) {
        if (n < 0) finalValue = "0";
        else if (n > 100) finalValue = "100";
        else if (Number.isInteger(n)) finalValue = String(n);
      }
    }
    setRowState((prev) => {
      let next = { ...prev, [field]: finalValue };
      if (field === "max" && finalValue !== "") {
        next.rubric = clampRubricBandsToCriterionMax(next.rubric, Number(finalValue));
      }
      if (field === "rubric") next._rubricTouched = true;
      return next;
    });
    setSaveError("");
  }, []);

  const markTouched = useCallback((field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  // ── Rubric toggle ───────────────────────────────────────────
  const toggleRubric = useCallback(() => {
    setRubricOpen((prev) => {
      if (!prev && row.rubric.length === 0) {
        const seeded =
          getConfigRubricSeed(row) ||
          defaultRubricBands(Number(row.max) || 30);
        const cMax = Number(row.max);
        const bounded =
          Number.isFinite(cMax) && cMax >= 0
            ? clampRubricBandsToCriterionMax(seeded, cMax)
            : seeded;
        setRowState((r) => ({ ...r, rubric: bounded, _rubricTouched: true }));
      }
      return !prev;
    });
  }, [row.rubric.length, row.max]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Save ────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (isLocked) {
      setSaveError("Locked — scores exist for this period.");
      return;
    }

    setSaveAttempted(true);

    const hasFieldErrors = Object.keys(fieldErrors).length > 0;
    const hasRubricErrors =
      rubricErrors &&
      (Object.keys(rubricErrors.bandRangeErrors).length > 0 ||
        Object.keys(rubricErrors.bandLevelErrors).length > 0 ||
        Object.keys(rubricErrors.bandDescErrors).length > 0 ||
        rubricErrors.coverageError);

    if (hasFieldErrors || hasRubricErrors) {
      if (hasRubricErrors) setRubricOpen(true);
      if (fieldErrors.outcome) setOutcomeOpen(true);

      // Shake the save button
      if (saveBtnRef.current) {
        saveBtnRef.current.classList.remove("vera-btn-shake");
        // Force reflow so re-adding the class restarts the animation
        void saveBtnRef.current.offsetWidth;
        saveBtnRef.current.classList.add("vera-btn-shake");
      }

      // Scroll to first error field
      requestAnimationFrame(() => {
        const firstError = formRef.current?.querySelector(".vera-inline-error, .vera-coverage-banner, .error");
        if (firstError) {
          firstError.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      });

      return;
    }

    setSaving(true);
    setSaveError("");

    try {
      const boundedRubric = clampRubricBandsToCriterionMax(
        row.rubric,
        Number(row.max)
      );
      const config = criterionToConfig({
        ...row,
        outcomes: sanitizeOutcomes(row.outcomes),
        rubric: boundedRubric,
      });

      const newTemplate = isNew
        ? [...(criteriaConfig || []), config]
        : (criteriaConfig || []).map((c, i) =>
            i === editIndex ? config : c
          );

      const result = await onSave(newTemplate);
      if (!result?.ok) {
        setSaveError(result?.error || "Could not save. Try again.");
      } else {
        onClose();
      }
    } catch (e) {
      setSaveError(e?.message || "Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  }, [
    isLocked,
    fieldErrors,
    rubricErrors,
    row,
    sanitizeOutcomes,
    isNew,
    criteriaConfig,
    editIndex,
    onSave,
    onClose,
  ]);

  // ── Derived ─────────────────────────────────────────────────
  const budgetFillOther = Math.min(100, otherTotal);
  const budgetFillCurrent = Math.min(
    100 - budgetFillOther,
    Math.max(0, currentMax)
  );
  const budgetColor =
    newTotal === 100
      ? "var(--success)"
      : newTotal > 100
        ? "var(--danger)"
        : "var(--accent)";

  return (
    <Drawer open={open} onClose={onClose} id="drawer-edit-single-criterion">
      {/* ── Header ──────────────────────────────────────── */}
      <div className="fs-drawer-header">
        <div className="fs-drawer-header-row">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className="crt-drawer-icon">
              {isNew ? <Plus size={17} strokeWidth={2} /> : <Pencil size={17} strokeWidth={2} />}
            </div>
            <div>
              <div className="crt-drawer-title">
                {isNew ? "Add Criterion" : "Edit Criterion"}
              </div>
              <div className="crt-drawer-subtitle">
                {isNew
                  ? "Define a new scoring criterion"
                  : "Modify scoring weights and rubric"}
                {period?.name && (
                  <span className="crt-semester-tag">{period.name}</span>
                )}
              </div>
            </div>
          </div>
          <button
            className="fs-close"
            onClick={onClose}
            style={{ width: 30, height: 30, borderRadius: 7 }}
            aria-label="Close"
          >
            <X size={14} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────── */}
      <div className="fs-drawer-body">
        {/* Budget bar */}
        <div className="crt-budget-bar">
          <div className="crt-budget-header">
            <span className="crt-budget-label">WEIGHT BUDGET</span>
            <span
              className={`crt-budget-badge${newTotal === 100 ? " valid" : newTotal > 100 ? " over" : ""}`}
            >
              {newTotal} / 100
            </span>
          </div>
          <div className="crt-budget-track">
            <div
              className="crt-budget-fill-other"
              style={{ width: `${budgetFillOther}%` }}
            />
            <div
              className="crt-budget-fill-current"
              style={{
                width: `${budgetFillCurrent}%`,
                background: budgetColor,
              }}
            />
          </div>
          <div className="crt-budget-detail">
            <span>
              Other criteria: <strong>{otherTotal}</strong> pts
            </span>
            <span>
              Available: <strong>{available}</strong> pts
            </span>
          </div>
        </div>

        {/* Form */}
        <div className="crt-single-form" ref={formRef}>
          {/* Field grid: Label / Short label / Weight */}
          <div className="crt-field-grid">
            <div className="crt-field">
              <div className="crt-field-label">Label</div>
              <input
                className={[
                  "crt-field-input",
                  showError("label") && "error",
                ]
                  .filter(Boolean)
                  .join(" ")}
                value={row.label}
                onChange={(e) => setField("label", e.target.value)}
                onBlur={() => markTouched("label")}
                placeholder="Technical Content"
                aria-label="Criterion label"
              />
              {showError("label") && (
                <InlineError>{fieldErrors.label}</InlineError>
              )}
            </div>

            <div className="crt-field">
              <div className="crt-field-label">Short label</div>
              <input
                className={[
                  "crt-field-input",
                  showError("shortLabel") && "error",
                ]
                  .filter(Boolean)
                  .join(" ")}
                value={row.shortLabel}
                onChange={(e) => setField("shortLabel", e.target.value)}
                onBlur={() => markTouched("shortLabel")}
                placeholder="Technical"
                aria-label="Criterion short label"
              />
              {showError("shortLabel") && (
                <InlineError>{fieldErrors.shortLabel}</InlineError>
              )}
            </div>

            <div className="crt-field">
              <div className="crt-field-label">Weight</div>
              {fullyLocked ? (
                <>
                  <input
                    className="crt-field-input mono locked"
                    value={row.max}
                    readOnly
                    aria-label="Criterion weight (locked)"
                  />
                  <div className="crt-locked-hint">
                    <Lock size={12} /> Locked
                  </div>
                </>
              ) : (
                <>
                  <input
                    className={[
                      "crt-field-input mono",
                      showError("max") && "error",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    type="number"
                    min="1"
                    max="100"
                    value={row.max}
                    onChange={(e) => setField("max", e.target.value)}
                    onBlur={() => markTouched("max")}
                    placeholder="30"
                    aria-label="Criterion weight"
                  />
                  {showError("max") && (
                    <InlineError>{fieldErrors.max}</InlineError>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="crt-field" style={{ marginTop: 10 }}>
            <div className="crt-field-label">
              Description <span className="crt-opt">(optional)</span>
            </div>
            <textarea
              className={[
                "crt-textarea",
                showError("blurb") && "error",
              ]
                .filter(Boolean)
                .join(" ")}
              value={row.blurb}
              onChange={(e) => setField("blurb", e.target.value)}
              onBlur={() => markTouched("blurb")}
              placeholder={RUBRIC_EDITOR_TEXT.criterionBlurbPlaceholder}
              aria-label="Criterion description"
              rows={2}
            />
            {showError("blurb") && (
              <InlineError>{fieldErrors.blurb}</InlineError>
            )}
          </div>

          {/* Outcome mapping */}
          {(outcomeConfig || []).length > 0 && (
            <div className="crt-sub">
              <button
                type="button"
                className={`crt-sub-toggle${outcomeOpen ? " open" : ""}`}
                onClick={() => !fullyLocked && setOutcomeOpen((p) => !p)}
                aria-expanded={outcomeOpen}
                disabled={fullyLocked}
              >
                <ChevronRight size={14} />
                Outcome Mapping
                <span className="crt-sub-count">
                  {sanitizeOutcomes(row.outcomes).length} mapped
                </span>
              </button>
              {outcomeOpen && (
                <div className="crt-sub-body">
                  <OutcomePillSelector
                    selected={sanitizeOutcomes(row.outcomes)}
                    outcomeConfig={outcomeConfig}
                    onChange={(next) => setField("outcomes", next)}
                    disabled={fullyLocked}
                  />
                </div>
              )}
            </div>
          )}

          {/* Rubric bands */}
          <div className="crt-sub">
            <button
              type="button"
              className={`crt-sub-toggle${rubricOpen ? " open" : ""}`}
              onClick={toggleRubric}
              aria-expanded={rubricOpen}
            >
              <ChevronRight size={14} />
              Rubric Bands
              <span className="crt-sub-count">
                {row.rubric.length} level{row.rubric.length !== 1 ? "s" : ""}
              </span>
            </button>
            {rubricOpen && (
              <div className="crt-sub-body">
                <RubricBandEditor
                  bands={row.rubric}
                  onChange={(next) => setField("rubric", next)}
                  disabled={fullyLocked}
                  criterionMax={row.max}
                  rubricErrors={
                    row._rubricTouched || saveAttempted ? rubricErrors : null
                  }
                />
              </div>
            )}
          </div>
        </div>

        {/* Save error */}
        {saveError && (
          <div style={{ marginTop: 16 }}>
            <AlertCard variant="error">{saveError}</AlertCard>
          </div>
        )}
      </div>

      {/* ── Footer ──────────────────────────────────────── */}
      <div className="fs-drawer-footer">
        <div className="crt-footer-meta">
          {newTotal === 100 ? (
            <>
              <Check
                size={14}
                style={{ color: "var(--success)", flexShrink: 0 }}
              />
              <span>
                Total: <span className="crt-footer-count">100</span> pts
              </span>
            </>
          ) : (
            <>
              <AlertCircle
                size={14}
                style={{
                  color:
                    newTotal > 100
                      ? "var(--danger)"
                      : "var(--warning, #f59e0b)",
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  color:
                    newTotal > 100 ? "var(--danger)" : "var(--text-tertiary)",
                }}
              >
                Total: <span className="crt-footer-count">{newTotal}</span> /
                100 pts
              </span>
            </>
          )}
        </div>
        <button className="crt-cancel-btn" onClick={onClose}>
          Cancel
        </button>
        <button
          ref={saveBtnRef}
          className="crt-save-btn"
          disabled={saving || fullyLocked}
          onClick={handleSave}
        >
          {saving ? "Saving…" : isNew ? "Add Criterion" : "Save Changes"}
        </button>
      </div>
    </Drawer>
  );
}
