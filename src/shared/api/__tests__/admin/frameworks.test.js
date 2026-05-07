import { describe, expect, vi, beforeEach } from "vitest";
import { qaTest } from "../../../../test/qaTest.js";

const { mockFrom, mockRpc } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockRpc: vi.fn(),
}));

// Chain helpers
const makeChain = (resolveWith) => {
  const chain = {};
  const methods = ["select", "insert", "update", "delete", "eq", "or", "is", "order", "single"];
  methods.forEach((m) => {
    chain[m] = vi.fn(() => chain);
  });
  chain.then = (res, rej) => Promise.resolve(resolveWith).then(res, rej);
  return chain;
};

vi.mock("@/shared/api/core/client", () => ({
  supabase: { from: mockFrom, rpc: mockRpc },
}));

import {
  listFrameworks,
  createFramework,
  updateFramework,
  deleteFramework,
  listOutcomes,
  createOutcome,
  updateOutcome,
  deleteOutcome,
  cloneFramework,
} from "../../admin/frameworks.js";

describe("admin/frameworks API", () => {
  beforeEach(() => vi.clearAllMocks());

  qaTest("api.admin.fw.01", async () => {
    const fwList = [{ id: "fw-1", name: "MÜDEK", organization_id: null }];
    const chain = makeChain({ data: fwList, error: null });
    mockFrom.mockReturnValue(chain);

    const result = await listFrameworks("org-1");
    expect(result).toEqual(fwList);
    expect(mockFrom).toHaveBeenCalledWith("frameworks");
    expect(chain.or).toHaveBeenCalledWith(
      expect.stringContaining("org-1")
    );
  });

  qaTest("api.admin.fw.02", async () => {
    const chain = makeChain({ data: null, error: { message: "not found" } });
    mockFrom.mockReturnValue(chain);

    await expect(listFrameworks("org-1")).rejects.toMatchObject({ message: "not found" });
  });

  qaTest("api.admin.fw.03", async () => {
    const created = { id: "fw-2", name: "ABET" };
    const chain = makeChain({ data: created, error: null });
    mockFrom.mockReturnValue(chain);

    const result = await createFramework({ name: "ABET", organization_id: "org-1" });
    expect(result).toEqual(created);
    expect(mockFrom).toHaveBeenCalledWith("frameworks");
    expect(chain.insert).toHaveBeenCalled();
  });

  qaTest("api.admin.fw.04", async () => {
    const updated = { id: "fw-2", name: "ABET v2" };
    const chain = makeChain({ data: updated, error: null });
    mockFrom.mockReturnValue(chain);

    const result = await updateFramework("fw-2", { name: "ABET v2" });
    expect(result).toEqual(updated);
    expect(chain.update).toHaveBeenCalledWith({ name: "ABET v2" });
    expect(chain.eq).toHaveBeenCalledWith("id", "fw-2");
  });

  qaTest("api.admin.fw.05", async () => {
    const chain = makeChain({ error: null });
    mockFrom.mockReturnValue(chain);

    await deleteFramework("fw-2");
    expect(chain.delete).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith("id", "fw-2");
  });

  qaTest("api.admin.fw.06", async () => {
    const outcomes = [{ id: "o-1", code: "PO1", label: "Engineering Knowledge" }];
    const chain = makeChain({ data: outcomes, error: null });
    mockFrom.mockReturnValue(chain);

    const result = await listOutcomes("fw-1");
    expect(result).toEqual(outcomes);
    expect(mockFrom).toHaveBeenCalledWith("framework_outcomes");
  });

  qaTest("api.admin.fw.07", async () => {
    mockRpc.mockResolvedValue({ data: "new-outcome-uuid", error: null });

    const result = await createOutcome({
      framework_id: "fw-1",
      code: "PO7",
      label: "Environment",
      description: "Environmental impact",
      sort_order: 7,
    });
    expect(result).toBe("new-outcome-uuid");
    expect(mockRpc).toHaveBeenCalledWith(
      "rpc_admin_create_framework_outcome",
      expect.objectContaining({
        p_framework_id: "fw-1",
        p_code: "PO7",
        p_label: "Environment",
      })
    );
  });

  qaTest("api.admin.fw.08", async () => {
    mockRpc.mockResolvedValue({ data: "cloned-fw-uuid", error: null });

    const result = await cloneFramework("fw-1", "My MÜDEK", "org-1");
    expect(result).toEqual({ id: "cloned-fw-uuid", name: "My MÜDEK" });
    expect(mockRpc).toHaveBeenCalledWith("rpc_admin_clone_framework", {
      p_framework_id: "fw-1",
      p_new_name: "My MÜDEK",
      p_org_id: "org-1",
    });
  });
});
