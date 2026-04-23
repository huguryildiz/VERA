import { describe, expect, vi, beforeEach } from "vitest";
import { qaTest } from "../../../../test/qaTest.js";

const { mockFrom, mockRpc } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockRpc: vi.fn(),
}));

vi.mock("@/shared/lib/supabaseClient", () => ({
  supabase: { from: mockFrom, rpc: mockRpc },
}));

import {
  listPeriodCriterionOutcomeMaps,
  createPeriodOutcome,
  deletePeriodOutcome,
} from "../../admin/outcomes.js";

describe("admin/outcomes API", () => {
  beforeEach(() => vi.clearAllMocks());

  qaTest("api.admin.outcomes.01", async () => {
    const maps = [{ id: "m1", period_id: "p1", period_criterion_id: "c1", period_outcome_id: "o1" }];
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: maps, error: null }),
      }),
    });

    const result = await listPeriodCriterionOutcomeMaps("p1");
    expect(result).toEqual(maps);
  });

  qaTest("api.admin.outcomes.02", async () => {
    mockRpc.mockResolvedValue({ data: { id: "o1" }, error: null });

    const result = await createPeriodOutcome({
      period_id: "p1",
      code: "PO1",
      label: "Design",
      description: null,
      sort_order: 0,
    });
    expect(result).toEqual({ id: "o1" });
    expect(mockRpc).toHaveBeenCalledWith("rpc_admin_create_period_outcome", expect.objectContaining({ p_code: "PO1" }));
  });

  qaTest("api.admin.outcomes.03", async () => {
    mockRpc.mockResolvedValue({ error: null });
    await expect(deletePeriodOutcome("o1")).resolves.toBeUndefined();
    expect(mockRpc).toHaveBeenCalledWith("rpc_admin_delete_period_outcome", { p_outcome_id: "o1" });
  });
});
