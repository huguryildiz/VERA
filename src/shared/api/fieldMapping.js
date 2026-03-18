// src/shared/api/fieldMapping.js
// ============================================================
// Helpers for converting DB JSONB score data to the shapes
// that UI hooks and components expect.
//
// After the JSONB migration, `criteria_scores` keys in the DB
// match config.js criterion ids directly (e.g. "technical",
// "design", "delivery", "teamwork"), so no renaming is needed.
//
// dbScoresToUi    — used by listProjects to hydrate jury state
// dbAvgScoresToUi — used by adminProjectSummary / adminOutcomeTrends
// ============================================================

/**
 * Map `criteria_scores` JSONB from a score row to the UI criterion-keyed
 * object expected by jury hooks. Keys are passed through directly.
 *
 * @param {{ criteria_scores?: Record<string, number|null> }} row
 * @returns {Record<string, number|null>}
 */
export function dbScoresToUi(row) {
  const cs = row.criteria_scores || {};
  return Object.fromEntries(
    Object.entries(cs).map(([k, v]) => [k, v ?? null])
  );
}

/**
 * Map `criteria_avgs` JSONB from an aggregate row to the UI criterion-keyed
 * averages object. Numeric strings from the DB are converted to Number.
 *
 * @param {{ criteria_avgs?: Record<string, string|number|null> }} row
 * @returns {Record<string, number|null>}
 */
export function dbAvgScoresToUi(row) {
  const avgs = row.criteria_avgs || {};
  return Object.fromEntries(
    Object.entries(avgs).map(([k, v]) => [k, v == null ? null : Number(v)])
  );
}
