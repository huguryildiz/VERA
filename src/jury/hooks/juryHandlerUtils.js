// src/jury/hooks/juryHandlerUtils.js
// ============================================================
// Tiny utility that derives effectiveCriteria and mudekLookup
// from semester templates. Used by the useJuryHandlers orchestrator
// and individual sub-hooks that need criteria information.
// ============================================================

import { getActiveCriteria, buildMudekLookup } from "../../shared/criteriaHelpers";

export function deriveEffectiveCriteria(criteriaTemplate) {
  return getActiveCriteria(criteriaTemplate);
}

export function deriveMudekLookup(mudekTemplate) {
  return buildMudekLookup(mudekTemplate);
}
