import { describe, expect, vi, beforeEach } from "vitest";
import { qaTest } from "../../../../test/qaTest.js";

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock("@/shared/lib/supabaseClient", () => ({
  supabase: { from: mockFrom },
}));

import { listProjects, createProject, deleteProject } from "../../admin/projects.js";

describe("admin/projects API", () => {
  beforeEach(() => vi.clearAllMocks());

  qaTest("api.admin.projects.01", async () => {
    const rows = [
      { id: "p1", title: "Project Alpha", project_no: 1, advisor_name: "Dr. A" },
    ];
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: rows, error: null }),
        }),
      }),
    });

    const result = await listProjects("period-001");
    expect(result).toHaveLength(1);
    expect(result[0].group_no).toBe(1);
    expect(result[0].advisor).toBe("Dr. A");
  });

  qaTest("api.admin.projects.02", async () => {
    const created = { id: "p2", title: "Project Beta", period_id: "period-001" };
    mockFrom.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: created, error: null }),
        }),
      }),
    });

    const result = await createProject({ periodId: "period-001", title: "Project Beta" });
    expect(result).toEqual(created);
  });

  qaTest("api.admin.projects.03", async () => {
    mockFrom.mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });

    await expect(deleteProject("p1")).resolves.toBeUndefined();
  });
});
