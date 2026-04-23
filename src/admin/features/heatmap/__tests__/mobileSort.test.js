import { describe, expect } from "vitest";
import { qaTest } from "../../../../test/qaTest.js";
import { MOBILE_SORT_KEYS, sortMobileJurors } from "../mobileSort.js";

const jurors = [
  { key: "j1", name: "Charlie" },
  { key: "j2", name: "alice" },
  { key: "j3", name: "Bob" },
];

describe("admin/features/heatmap/mobileSort", () => {
  qaTest("mobile.sort.01", () => {
    const result = sortMobileJurors(jurors, "name_asc");
    expect(result.map((j) => j.name)).toEqual(["alice", "Bob", "Charlie"]);
  });

  qaTest("mobile.sort.02", () => {
    const result = sortMobileJurors(jurors, "name_desc");
    expect(result.map((j) => j.name)).toEqual(["Charlie", "Bob", "alice"]);
  });

  qaTest("mobile.sort.03", () => {
    const workflow = new Map([
      ["j1", "not_started"],
      ["j2", "completed"],
      ["j3", "in_progress"],
    ]);
    const result = sortMobileJurors(jurors, "status", { workflow });
    // completed(0) < in_progress(1) < not_started(3)
    expect(result[0].key).toBe("j2"); // alice — completed
    expect(result[1].key).toBe("j3"); // Bob — in_progress
    expect(result[2].key).toBe("j1"); // Charlie — not_started
  });

  qaTest("mobile.sort.04", () => {
    const rowAvgs = new Map([
      ["j1", 85],
      ["j2", 92],
      ["j3", null], // null — goes to bottom
    ]);
    const result = sortMobileJurors(jurors, "avg_desc", { rowAvgs });
    expect(result[0].key).toBe("j2"); // 92
    expect(result[1].key).toBe("j1"); // 85
    expect(result[2].key).toBe("j3"); // null → last
  });

  qaTest("mobile.sort.05", () => {
    // Unknown key falls back to name_asc
    const result = sortMobileJurors(jurors, "unknown_key");
    expect(result.map((j) => j.name)).toEqual(["alice", "Bob", "Charlie"]);
  });

  qaTest("mobile.sort.06", () => {
    expect(MOBILE_SORT_KEYS).toHaveLength(5);
    const values = MOBILE_SORT_KEYS.map((k) => k.value);
    expect(values).toContain("avg_desc");
    expect(values).toContain("avg_asc");
    expect(values).toContain("name_asc");
    expect(values).toContain("name_desc");
    expect(values).toContain("status");
    MOBILE_SORT_KEYS.forEach((k) => {
      expect(k.label).toBeTruthy();
    });
  });
});
