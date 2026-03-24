// src/admin/selectors/gridSelectors.js
// ============================================================
// Pure selector functions extracted from useScoreGridData.
//
// No React. No useMemo. No side effects.
// All functions are safe to import and unit-test in isolation.
// ============================================================

import { rowKey } from "../utils";
import { getCellState, getPartialTotal, getJurorWorkflowState, jurorStatusMeta } from "../scoreHelpers";

// ── buildLookup ───────────────────────────────────────────────
// Build a two-level map: jurorKey → { [projectId]: entry }
// Field list is driven by activeCriteria (falls back to config
// CRITERIA when no template is supplied — caller's responsibility).
//
// @param {Array}  data           - score rows from the DB
// @param {Array}  activeCriteria - criteria array (e.g. CRITERIA from config)
// @returns {{ [jurorKey: string]: { [projectId: string]: object } }}
export function buildLookup(data, activeCriteria) {
  const map = {};
  (data || []).forEach((r) => {
    const key = rowKey(r);
    if (!map[key]) map[key] = {};
    map[key][r.projectId] = {
      total:            r.total,
      status:           r.status,
      editingFlag:      r.editingFlag,
      finalSubmittedAt: r.finalSubmittedAt || "",
      ...Object.fromEntries((activeCriteria || []).map((c) => [c.id, r[c.id]])),
    };
  });
  return map;
}

// ── buildJurorFinalMap ────────────────────────────────────────
// Returns a Map<jurorKey, boolean> indicating whether each juror
// has completed a final submission.
//
// @param {Array} jurors
// @returns {Map<string, boolean>}
export function buildJurorFinalMap(jurors) {
  return new Map(
    (jurors || []).map((j) => [j.key, Boolean(j.finalSubmitted || j.finalSubmittedAt)])
  );
}

// ── filterCompletedJurors ────────────────────────────────────
// Returns jurors that have finalSubmitted AND are not currently
// in edit mode. Used to compute the average row.
//
// @param {Array} jurors
// @returns {Array}
export function filterCompletedJurors(jurors) {
  return (jurors || []).filter(
    (j) => (j.finalSubmitted || j.finalSubmittedAt) && !j.editEnabled
  );
}

// ── computeGroupAverages ──────────────────────────────────────
// Computes per-group averages across completed jurors only.
// Only "scored" cell states contribute — partial/empty cells are excluded.
//
// @param {Array}  completedJurors - output of filterCompletedJurors
// @param {Array}  groups          - group/project list
// @param {object} lookup          - output of buildLookup
// @returns {Array<string|null>}   - one entry per group (2-decimal string or null)
export function computeGroupAverages(completedJurors, groups, lookup) {
  return (groups || []).map((g) => {
    const vals = completedJurors
      .map((j) => {
        const entry = lookup[j.key]?.[g.id];
        return getCellState(entry) === "scored" ? Number(entry.total) : null;
      })
      .filter((v) => Number.isFinite(v));
    return vals.length
      ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2)
      : null;
  });
}

// ── buildExportRowsData ───────────────────────────────────────
// Builds export-ready row objects for a given list of jurors.
// Kept out of the UI layer so data logic doesn't bleed into components.
//
// @param {Array}  jurorList        - jurors to include in the export
// @param {Array}  groups           - group/project list
// @param {object} lookup           - output of buildLookup
// @param {Map}    jurorFinalMap    - output of buildJurorFinalMap
// @param {Map}    jurorWorkflowMap - Map<jurorKey, workflowState>
// @returns {Array<{ name: string, dept: string, statusLabel: string, scores: object }>}
export function buildExportRowsData(jurorList, groups, lookup, jurorFinalMap, jurorWorkflowMap) {
  const safeGroups = groups || [];
  return (jurorList || []).map((juror) => {
    const wfState     = jurorWorkflowMap.get(juror.key) ?? getJurorWorkflowState(juror, safeGroups, lookup, jurorFinalMap);
    const statusLabel = jurorStatusMeta[wfState]?.label ?? wfState;
    const scores      = {};
    safeGroups.forEach((g) => {
      const entry = lookup[juror.key]?.[g.id] ?? null;
      const state = getCellState(entry);
      scores[g.id] =
        state === "scored"  ? Number(entry.total) :
        state === "partial" ? getPartialTotal(entry) :
        null;
    });
    return { name: juror.name, dept: juror.dept ?? "", statusLabel, scores };
  });
}
