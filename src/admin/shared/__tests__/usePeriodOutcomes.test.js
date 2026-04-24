import { describe, vi, expect, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { qaTest } from "@/test/qaTest";

const mockListPeriodOutcomes = vi.fn();
const mockListPeriodCriteriaForMapping = vi.fn();
const mockListPeriodCriterionOutcomeMaps = vi.fn();

vi.mock("@/shared/api", () => ({
  listPeriodOutcomes: (...a) => mockListPeriodOutcomes(...a),
  listPeriodCriteriaForMapping: (...a) => mockListPeriodCriteriaForMapping(...a),
  listPeriodCriterionOutcomeMaps: (...a) => mockListPeriodCriterionOutcomeMaps(...a),
  createPeriodOutcome: vi.fn(),
  updatePeriodOutcome: vi.fn(),
  deletePeriodOutcome: vi.fn(),
  upsertPeriodCriterionOutcomeMap: vi.fn(),
  deletePeriodCriterionOutcomeMap: vi.fn(),
  createFramework: vi.fn(),
  cloneFramework: vi.fn(),
  assignFrameworkToPeriod: vi.fn(),
  freezePeriodSnapshot: vi.fn(),
}));

const mockGetOutcomesScratch = vi.fn(() => null);
const mockSetOutcomesScratch = vi.fn();
const mockClearOutcomesScratch = vi.fn();

vi.mock("@/shared/storage/adminStorage", () => ({
  getOutcomesScratch: (...a) => mockGetOutcomesScratch(...a),
  setOutcomesScratch: (...a) => mockSetOutcomesScratch(...a),
  clearOutcomesScratch: (...a) => mockClearOutcomesScratch(...a),
}));

vi.mock("@/shared/lib/supabaseClient", () => ({ supabase: {} }));

import { usePeriodOutcomes } from "../usePeriodOutcomes";

const FAKE_OUTCOMES = [
  { id: "o1", code: "PO1", label: "Design", description: null, sort_order: 1, coverage_type: null },
  { id: "o2", code: "PO2", label: "Analysis", description: null, sort_order: 2, coverage_type: null },
];

const FAKE_CRITERIA = [
  { id: "c1", label: "Criterion 1" },
  { id: "c2", label: "Criterion 2" },
];

const FAKE_MAPPINGS = [
  { id: "map1", period_criterion_id: "c1", period_outcome_id: "o1", coverage_type: "direct" },
];

describe("usePeriodOutcomes", () => {
  beforeEach(() => {
    mockListPeriodOutcomes.mockResolvedValue(FAKE_OUTCOMES);
    mockListPeriodCriteriaForMapping.mockResolvedValue(FAKE_CRITERIA);
    mockListPeriodCriterionOutcomeMaps.mockResolvedValue(FAKE_MAPPINGS);
    mockGetOutcomesScratch.mockReturnValue(null);
    mockSetOutcomesScratch.mockClear();
    mockClearOutcomesScratch.mockClear();
  });

  qaTest("admin.shared.periodOutcomes.01", async () => {
    const { result } = renderHook(() => usePeriodOutcomes({ periodId: null }));
    expect(result.current.loading).toBe(false);
    expect(result.current.outcomes).toHaveLength(0);
    expect(result.current.criteria).toHaveLength(0);
    expect(mockListPeriodOutcomes).not.toHaveBeenCalled();
  });

  qaTest("admin.shared.periodOutcomes.02", async () => {
    const { result } = renderHook(() => usePeriodOutcomes({ periodId: "p1" }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockListPeriodOutcomes).toHaveBeenCalledWith("p1");
    expect(mockListPeriodCriteriaForMapping).toHaveBeenCalledWith("p1");
    expect(mockListPeriodCriterionOutcomeMaps).toHaveBeenCalledWith("p1");

    expect(result.current.outcomes).toHaveLength(2);
    expect(result.current.criteria).toHaveLength(2);
    expect(result.current.mappings).toHaveLength(1);
  });

  qaTest("admin.shared.periodOutcomes.03", async () => {
    const { result } = renderHook(() => usePeriodOutcomes({ periodId: "p1" }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.isDirty).toBe(false);

    await act(async () => {
      result.current.addOutcome({ code: "PO3", shortLabel: "New", description: null, criterionIds: [], coverageType: "direct" });
    });

    expect(result.current.isDirty).toBe(true);
    expect(result.current.outcomes).toHaveLength(3);
    const newItem = result.current.outcomes[2];
    expect(newItem.id).toMatch(/^tmp_/);
    expect(newItem.code).toBe("PO3");
  });

  qaTest("admin.shared.periodOutcomes.04", async () => {
    const { result } = renderHook(() => usePeriodOutcomes({ periodId: "p1" }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      result.current.removeOutcome("o2");
    });

    expect(result.current.outcomes).toHaveLength(1);
    expect(result.current.outcomes[0].id).toBe("o1");
    // mappings for o2 should also be removed (none existed, but o1's mapping stays)
    expect(result.current.mappings).toHaveLength(1);
    expect(result.current.isDirty).toBe(true);

    await act(async () => {
      result.current.removeOutcome("o1");
    });
    // o1's mapping should now also be gone
    expect(result.current.mappings).toHaveLength(0);
  });

  qaTest("admin.shared.periodOutcomes.05", async () => {
    const { result } = renderHook(() => usePeriodOutcomes({ periodId: "p1" }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      result.current.addOutcome({ code: "PO3", shortLabel: "New", description: null });
    });
    expect(result.current.isDirty).toBe(true);

    await act(async () => {
      result.current.discardDraft();
    });

    expect(result.current.outcomes).toHaveLength(2);
    expect(result.current.isDirty).toBe(false);
    expect(mockClearOutcomesScratch).toHaveBeenCalledWith("p1");
  });

  qaTest("admin.shared.periodOutcomes.06", async () => {
    const { result } = renderHook(() => usePeriodOutcomes({ periodId: "p1" }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    // o1 has a direct mapping via c1
    expect(result.current.getCoverage("o1")).toBe("direct");
    // o2 has no mappings — falls back to coverage_type field (null → "none")
    expect(result.current.getCoverage("o2")).toBe("none");
  });
});
