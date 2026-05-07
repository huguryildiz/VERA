import { describe, expect } from "vitest";
import { qaTest } from "../../test/qaTest.js";
import { stripSlugPrefix } from "../periodFormat.js";

describe("shared/periodFormat", () => {
  qaTest("shared.periodFormat.01", () => {
    expect(stripSlugPrefix("boun-cs Spring 2026", "boun-cs")).toBe("Spring 2026");
  });

  qaTest("shared.periodFormat.02", () => {
    expect(stripSlugPrefix("Spring 2026", "itu")).toBe("Spring 2026");
  });

  qaTest("shared.periodFormat.03", () => {
    expect(stripSlugPrefix(null, "boun-cs")).toBe("");
    expect(stripSlugPrefix(undefined, "boun-cs")).toBe("");
    expect(stripSlugPrefix("", "boun-cs")).toBe("");
  });

  qaTest("shared.periodFormat.04", () => {
    expect(stripSlugPrefix("Spring 2026", null)).toBe("Spring 2026");
    expect(stripSlugPrefix("Spring 2026", "")).toBe("Spring 2026");
    expect(stripSlugPrefix("Spring 2026")).toBe("Spring 2026");
  });

  qaTest("shared.periodFormat.05", () => {
    // name exactly equals slug → result would be empty string → return original name
    expect(stripSlugPrefix("boun-cs", "boun-cs")).toBe("boun-cs");
  });
});
