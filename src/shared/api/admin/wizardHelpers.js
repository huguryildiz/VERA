// src/shared/api/admin/wizardHelpers.js
// Setup wizard helper functions — orchestrates framework + outcome creation.

import { OUTCOME_DEFINITIONS } from "@/shared/constants";
import { createFramework, createOutcome } from "./frameworks";

/**
 * Apply standard framework (MÜDEK 18 outcomes) for an organization.
 * Creates framework, 18 outcomes from OUTCOME_DEFINITIONS, and criterion-outcome mappings.
 *
 * @param {string} organizationId - Organization ID (null for system-wide framework)
 * @returns {Promise<Object>} { framework, outcomeMap }
 *   - framework: created framework record
 *   - outcomeMap: { code => outcome record } for easy reference
 */
export async function applyStandardFramework(organizationId) {
  // 1. Create framework
  const framework = await createFramework({
    organization_id: organizationId || null,
    name: "Standard Evaluation",
    description: "Standard evaluation framework with programme outcomes",
  });

  // 2. Create all 18 outcomes from OUTCOME_DEFINITIONS
  const outcomeMap = {};
  let sortOrder = 1;

  for (const [code, definitions] of Object.entries(OUTCOME_DEFINITIONS)) {
    const outcome = await createOutcome({
      framework_id: framework.id,
      code,
      label: `${code}: ${definitions.en}`,
      description: definitions.tr, // Turkish description as detail
      sort_order: sortOrder,
    });
    outcomeMap[code] = outcome;
    sortOrder++;
  }

  // Note: criterion-outcome mappings are created when period criteria are saved
  // via savePeriodCriteria() — each criterion's outcomes[] array defines the links.
  // Framework-level mappings require framework_criteria rows which are created
  // when a period snapshot is frozen from this framework.

  return { framework, outcomeMap };
}
