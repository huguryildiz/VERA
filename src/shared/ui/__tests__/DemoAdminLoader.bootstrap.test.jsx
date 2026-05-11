import { describe, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { qaTest } from "@/test/qaTest";

const mockSignIn = vi.fn(() => new Promise(() => {}));
const mockListPeriods = vi.fn();
const mockGetScores = vi.fn();
const mockGetProjectSummary = vi.fn();
const mockListJurorsSummary = vi.fn();
const mockGetJurorSummary = vi.fn();
const mockGetPeriodSummary = vi.fn();
const mockListPeriodCriteria = vi.fn();
const mockListPeriodOutcomes = vi.fn();
const mockListFrameworks = vi.fn();
const mockPickDefaultPeriod = vi.fn();

vi.mock("@/auth", () => ({
  useAuth: vi.fn(() => ({
    signIn: mockSignIn,
    activeOrganization: { id: "org-uuid-1" },
  })),
}));

vi.mock("@/shared/api", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockResolvedValue({ count: 5, error: null }),
    })),
  },
  listPeriods: (...args) => mockListPeriods(...args),
  getScores: (...args) => mockGetScores(...args),
  getProjectSummary: (...args) => mockGetProjectSummary(...args),
  listJurorsSummary: (...args) => mockListJurorsSummary(...args),
  getJurorSummary: (...args) => mockGetJurorSummary(...args),
  getPeriodSummary: (...args) => mockGetPeriodSummary(...args),
  listPeriodCriteria: (...args) => mockListPeriodCriteria(...args),
  listPeriodOutcomes: (...args) => mockListPeriodOutcomes(...args),
  listFrameworks: (...args) => mockListFrameworks(...args),
}));

vi.mock("@/jury/shared/periodSelection", () => ({
  pickDefaultPeriod: (...args) => mockPickDefaultPeriod(...args),
}));

import DemoAdminLoader from "../DemoAdminLoader.jsx";

describe("shared/ui/DemoAdminLoader/bootstrap-fast-path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete window.__VERA_BOOTSTRAP_PREFERRED;
    delete window.__VERA_PRELOAD;
    mockSignIn.mockImplementation(() => new Promise(() => {}));
    mockGetScores.mockResolvedValue([]);
    mockGetProjectSummary.mockResolvedValue([]);
    mockListJurorsSummary.mockResolvedValue([]);
    mockGetJurorSummary.mockResolvedValue([]);
    mockGetPeriodSummary.mockResolvedValue(null);
    mockListPeriodCriteria.mockResolvedValue([]);
    mockListPeriodOutcomes.mockResolvedValue([]);
    mockListFrameworks.mockResolvedValue([]);
  });

  qaTest("demo.loader.bootstrap.01", async () => {
    const periods = [{ id: "period-uuid-1", name: "Spring 2026" }];
    window.__VERA_BOOTSTRAP_PREFERRED = {
      orgId: "org-uuid-1",
      periods,
      defaultPeriodId: "period-uuid-1",
      expiresAt: Date.now() + 30000,
    };

    render(<DemoAdminLoader onComplete={vi.fn()} />);

    await waitFor(() => {
      expect(window.__VERA_PRELOAD).toBeDefined();
    }, { timeout: 3000 });

    expect(mockListPeriods).not.toHaveBeenCalled();
    expect(window.__VERA_BOOTSTRAP_PREFERRED).toBeUndefined();
    expect(window.__VERA_PRELOAD.targetId).toBe("period-uuid-1");
    expect(mockGetScores).toHaveBeenCalledWith("period-uuid-1");
  });

  qaTest("demo.loader.bootstrap.02", async () => {
    const periods = [{ id: "period-uuid-2", name: "Fall 2026" }];
    mockListPeriods.mockResolvedValue(periods);
    mockPickDefaultPeriod.mockReturnValue({ id: "period-uuid-2" });

    render(<DemoAdminLoader onComplete={vi.fn()} />);

    await waitFor(() => {
      expect(window.__VERA_PRELOAD).toBeDefined();
    }, { timeout: 3000 });

    expect(mockListPeriods).toHaveBeenCalledWith("org-uuid-1");
    expect(window.__VERA_PRELOAD.targetId).toBe("period-uuid-2");
  });
});
