// src/admin/hooks/useSetupWizard.js
// ============================================================
// Setup wizard state management hook
// Manages navigation, step completion derived from data,
// and localStorage persistence.
// ============================================================

import { useState, useEffect, useCallback, useMemo } from "react";

const STORAGE_KEY_PREFIX = "vera_setup_";

/**
 * Setup wizard state hook
 *
 * @param {Object} params
 * @param {string} params.orgId - Organization ID (for localStorage key)
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
  const storageKey = `${STORAGE_KEY_PREFIX}${orgId}`;
  const storageDataKey = `${storageKey}_data`;

  // Initialize current step from localStorage
  const [currentStep, setCurrentStep] = useState(() => {
    if (!orgId) return 1;
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? Math.max(1, Math.min(7, parseInt(saved, 10))) : 1;
    } catch {
      return 1;
    }
  });

  // Initialize wizard data from localStorage
  const [wizardData, setWizardDataInternal] = useState(() => {
    if (!orgId) return {};
    try {
      const saved = localStorage.getItem(storageDataKey);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Persist current step to localStorage
  useEffect(() => {
    if (!orgId) return;
    try { localStorage.setItem(storageKey, String(currentStep)); } catch { /* Safari private mode */ }
  }, [currentStep, orgId]);

  // Persist wizard data to localStorage
  useEffect(() => {
    if (!orgId) return;
    try {
      localStorage.setItem(storageDataKey, JSON.stringify(wizardData));
    } catch {
      // Silent fail if storage is full
    }
  }, [wizardData, orgId]);

  // Derive completed steps from actual data
  const completedSteps = useMemo(() => {
    const s = new Set();
    if (currentStep >= 1) s.add(1);                                   // Welcome: visited
    if (periods.length > 0) s.add(2);                                  // Period exists
    if (criteriaConfig.length > 0) s.add(3);                           // Criteria exist
    if (frameworks.length > 0 || wizardData.skippedOutcomes) s.add(4); // Outcomes (optional)
    if (jurors.length > 0) s.add(5);                                   // Jurors exist
    if (projects.length > 0) s.add(6);                                 // Projects exist
    if (hasEntryToken) s.add(7);                                       // Entry token
    return s;
  }, [currentStep, periods.length, criteriaConfig.length, frameworks.length, wizardData.skippedOutcomes, jurors.length, projects.length, hasEntryToken]);

  // Navigation methods
  const goToStep = useCallback(
    (step) => {
      const validStep = Math.max(1, Math.min(7, step));
      setCurrentStep(validStep);
    },
    []
  );

  const nextStep = useCallback(() => {
    setCurrentStep((s) => Math.min(7, s + 1));
  }, []);

  const prevStep = useCallback(() => {
    setCurrentStep((s) => Math.max(1, s - 1));
  }, []);

  const isStepComplete = useCallback(
    (step) => {
      return completedSteps.has(step);
    },
    [completedSteps]
  );

  // Calculate completion percentage
  const totalRequiredSteps = 7; // All 7 steps
  const completionPercent = Math.round(
    (completedSteps.size / totalRequiredSteps) * 100
  );

  // All required steps complete
  const setupComplete = completedSteps.size === totalRequiredSteps;

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
