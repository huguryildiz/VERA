// src/admin/hooks/useSetupWizard.js
// ============================================================
// Setup wizard state management hook
// Manages navigation and step completion derived from data.
// Current step is persisted in sessionStorage per org so that
// navigating away and returning resumes at the correct step.
// ============================================================

import { useState, useCallback, useMemo, useEffect } from "react";

const TOTAL_STEPS = 7;

/**
 * Derive the furthest step the wizard should start at based on
 * already-completed data. Returns the first incomplete step so
 * the user can continue from where they left off.
 *
 * Step map:
 *  1 Welcome  2 Period  3 Criteria  4 Outcome
 *  5 Jurors   6 Projects  7 Review
 */
function deriveResumeStep({ periods, criteriaConfig, jurors, projects }) {
  // Step order: 1 Welcome → 2 Period → 3 Criteria → 4 Outcome → 5 Jurors → 6 Projects → 7 Review
  //
  // Step 3 (Criteria) is considered complete when EITHER period_criteria rows
  // exist OR the period has a criteria_name set (the user picked a template
  // name without customizing rows yet — treat it as "labeled set in place").
  //
  // Step 4 (Outcome/Framework) completion is measured by whether the wizard's
  // own period has a framework assigned — NOT by the org-wide frameworks list
  // (which always contains the global VERA Standard and would never be empty).
  const period = periods[0];
  const criteriaDone = criteriaConfig.length > 0 || !!period?.criteria_name;
  if (!periods.length) return 1;                 // nothing done yet → Welcome
  if (!criteriaDone) return 3;                   // period done, no criteria → Criteria
  if (!period?.framework_id) return 4;           // criteria done, no framework on period → Outcome
  if (!jurors.length) return 5;                  // framework done, no jurors → Jurors
  if (!projects.length) return 6;                // jurors done, no projects → Projects
  return 7;                                      // everything done → Review
}

/**
 * Setup wizard state hook
 *
 * @param {Object} params
 * @param {string} params.orgId
 * @param {Array}  params.periods
 * @param {Array}  params.criteriaConfig
 * @param {Array}  params.frameworks
 * @param {Array}  params.jurors
 * @param {Array}  params.projects
 * @param {boolean} params.hasEntryToken
 */
export function useSetupWizard({
  orgId,
  periods = [],
  criteriaConfig = [],
  frameworks = [],
  jurors = [],
  projects = [],
  hasEntryToken = false,
} = {}) {
  const storageKey = orgId ? `sw_step_${orgId}` : null;
  const dataKey    = orgId ? `sw_data_${orgId}` : null;

  // ── Initial step resolution ──
  // Take the FURTHEST step between what was saved in sessionStorage and what the
  // data supports. This means:
  //  • If the user left mid-wizard and data was created externally (e.g. criteria
  //    built on the Criteria page, jurors added from the Jurors page), the wizard
  //    advances automatically to the first still-incomplete step.
  //  • If the user applied a template and navigated away before data finished
  //    loading, the saved step wins over the transiently-empty data snapshot.
  //  • Derivation is scoped to the wizard's OWN period (read from sw_data storage)
  //    so that other org periods don't inflate the derived step on remount.
  const [currentStep, setCurrentStep] = useState(() => {
    // Read the wizard's period ID from persistent data so we scope derivation
    // the same way the reactive useEffect does — prevents other org periods
    // from pulling the step up to 3+ on remount after the wizard period is gone.
    let initWizardPeriodId = null;
    if (dataKey) {
      try {
        const raw = sessionStorage.getItem(dataKey);
        if (raw) initWizardPeriodId = JSON.parse(raw).periodId ?? null;
      } catch {}
    }
    const activePeriods = initWizardPeriodId
      ? periods.filter((p) => p.id === initWizardPeriodId)
      : [];
    const derived = deriveResumeStep({ periods: activePeriods, criteriaConfig, frameworks, jurors, projects });
    if (storageKey) {
      try {
        const saved = sessionStorage.getItem(storageKey);
        if (saved) {
          const savedStep = Math.max(1, Math.min(TOTAL_STEPS, Number(saved)));
          // Wizard's period is gone — don't apply Math.max; allow reset to derived (1).
          if (activePeriods.length === 0) return derived;
          return Math.max(savedStep, derived);
        }
      } catch {}
    }
    return derived;
  });

  // ── wizardData: persist periodId etc. across navigation ──
  const [wizardData, setWizardDataInternal] = useState(() => {
    const base = {};
    // Restore persisted data
    if (dataKey) {
      try {
        const saved = sessionStorage.getItem(dataKey);
        if (saved) Object.assign(base, JSON.parse(saved));
      } catch {}
    }
    // Fill periodId from real data; also clear it if the saved period no longer exists.
    // Use null (not delete) so we can distinguish "explicitly cleared" from "never set".
    const periodIds = new Set(periods.map((p) => p.id));
    if (base.periodId && !periodIds.has(base.periodId)) {
      base.periodId = null; // period deleted — mark as explicitly cleared
    }
    // Auto-fill only when periodId was truly never set (undefined).
    // null means it was explicitly cleared (e.g. after period deletion); don't
    // re-attach to another org period in that case.
    if (base.periodId === undefined && periods.length > 0) {
      base.periodId = periods[0].id;
    }
    return base;
  });

  // Persist step + data on every change
  const persistStep = useCallback((step) => {
    if (!storageKey) return;
    try { sessionStorage.setItem(storageKey, String(step)); } catch {}
  }, [storageKey]);

  const persistData = useCallback((data) => {
    if (!dataKey) return;
    try { sessionStorage.setItem(dataKey, JSON.stringify(data)); } catch {}
  }, [dataKey]);

  // ── Reactive advancement ──
  // Data loads asynchronously after mount, and can also be created externally
  // (e.g. criteria built on the Criteria page). Advance automatically when data
  // supports a further step.
  //
  // Key rule: derive only from the WIZARD'S own period — not from whatever other
  // periods happen to exist in the org. This prevents a deleted wizard period from
  // being "replaced" by another period and incorrectly holding the wizard at step 3.
  //
  // • Wizard period exists   → only advance (Math.max protects against async-loading dips)
  // • Wizard period missing  → allow going backwards (return derived, which is 1)
  const wizardPeriodId = wizardData.periodId;
  useEffect(() => {
    const activePeriods = wizardPeriodId
      ? periods.filter((p) => p.id === wizardPeriodId)
      : [];
    const derived = deriveResumeStep({ periods: activePeriods, criteriaConfig, frameworks, jurors, projects });
    // Always take Math.max — only advance, never retreat due to transient async loading.
    // Period deletion is handled by SetupWizardPage's goToStep(1) before this effect
    // fires; at that point s=1 and derived=1 so Math.max(1,1)=1 is correct.
    setCurrentStep((s) => {
      const next = Math.max(s, derived);
      if (next !== s) persistStep(next);
      return next;
    });
  }, [wizardPeriodId, periods, criteriaConfig, frameworks, jurors, projects, persistStep]);

  // Steps before currentStep are marked completed in the stepper
  const completedSteps = useMemo(() => {
    const s = new Set();
    for (let i = 1; i < currentStep; i++) s.add(i);
    return s;
  }, [currentStep]);

  const goToStep = useCallback((step) => {
    const s = Math.max(1, Math.min(TOTAL_STEPS, step));
    setCurrentStep(s);
    persistStep(s);
  }, [persistStep]);

  const nextStep = useCallback(() => {
    setCurrentStep((s) => {
      const n = Math.min(TOTAL_STEPS, s + 1);
      persistStep(n);
      return n;
    });
  }, [persistStep]);

  const prevStep = useCallback(() => {
    setCurrentStep((s) => {
      const n = Math.max(1, s - 1);
      persistStep(n);
      return n;
    });
  }, [persistStep]);

  const isStepComplete = useCallback(
    (step) => completedSteps.has(step),
    [completedSteps]
  );

  const setWizardData = useCallback((patch) => {
    setWizardDataInternal((prev) => {
      const next = { ...prev, ...patch };
      persistData(next);
      return next;
    });
  }, [persistData]);

  const completionPercent = Math.round((completedSteps.size / TOTAL_STEPS) * 100);
  const setupComplete = currentStep > TOTAL_STEPS;

  return {
    currentStep,
    completedSteps,
    goToStep,
    nextStep,
    prevStep,
    isStepComplete,
    completionPercent,
    setupComplete,
    wizardData,
    setWizardData,
  };
}
