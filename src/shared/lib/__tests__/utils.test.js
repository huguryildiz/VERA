import { describe, expect } from "vitest";
import { qaTest } from "../../../test/qaTest.js";
import { cn } from "../utils.js";

describe("utils — cn", () => {
  qaTest("lib.utils.01", () => {
    expect(cn("foo", "bar", "baz")).toBe("foo bar baz");
  });

  qaTest("lib.utils.02", () => {
    expect(cn("foo", undefined, null, false, "bar")).toBe("foo bar");
  });
});
