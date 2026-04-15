// src/admin/hooks/useSetupWizard.js
// ============================================================
// Setup wizard state management hook
// Manages navigation and step completion derived from data.
// State is NOT persisted — resets to step 1 on every visit.
// ============================================================

import { useState, useCallback, useMemo } from "react";

/**
 * Setup wizard state hook
 *
 * @param {Object} params
 * @param {string} params.orgId - Organization ID
 * @param {Array} params.periods - Array of evaluation periods
 * @param {Array} params.criteriaConfig - Array of criteria configurations
 * @param {Array} params.frameworks - Array of evaluation frameworks
 * @param {Array} params.jurors - Array of jurors
 * @param {Array} params.projects - Array of projects
 * @param {boolean} params.hasEntryToken - Whether entry token exists
 *
 * @returns {Object} Wizard state and methods
 *   - currentStep: number (1-7)
 *   - completedSteps: Set<number> - derived from data
 *   - goToStep(n): navigate to step n
 *   - nextStep(): go to next step
 *   - prevStep(): go to previous step
 *   - isStepComplete(n): check if step n is done
 *   - completionPercent: 0-100
 *   - setupComplete: all required steps done
 *   - wizardData: { periodId, frameworkId, skippedOutcomes, ... }
 *   - setWizardData(patch): merge patch into wizard data
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
  // Always start from step 1 — no persistence between sessions
  const [currentStep, setCurrentStep] = useState(1);
  const [wizardData, setWizardDataInternal] = useState({});

  // Steps before currentStep are completed; currentStep is active; after is pending.
  const completedSteps = useMemo(() => {
    const s = new Set();
    for (let i = 1; i < currentStep; i++) s.add(i);
    return s;
  }, [currentStep]);

  // Navigation methods
  const goToStep = useCallback((step) => {
    setCurrentStep(Math.max(1, Math.min(8, step)));
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStep((s) => Math.min(8, s + 1));
  }, []);

  const prevStep = useCallback(() => {
    setCurrentStep((s) => Math.max(1, s - 1));
  }, []);

  const isStepComplete = useCallback(
    (step) => completedSteps.has(step),
    [completedSteps]
  );

  const completionPercent = Math.round((completedSteps.size / 8) * 100);
  const setupComplete = currentStep > 8;

  // Merge patch into wizard data
  const setWizardData = useCallback((patch) => {
    setWizardDataInternal((prev) => ({ ...prev, ...patch }));
  }, []);

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
