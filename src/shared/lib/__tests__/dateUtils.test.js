import { describe, expect } from "vitest";
import { qaTest } from "../../../test/qaTest.js";
import { formatDateTime, formatDate, formatTime } from "../dateUtils.js";

describe("dateUtils", () => {
  qaTest("lib.date.01", () => {
    expect(formatDateTime(null)).toBe("—");
    expect(formatDateTime(undefined)).toBe("—");
  });

  qaTest("lib.date.02", () => {
    const result = formatDateTime("2025-12-02T10:30:00Z");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
    expect(result).not.toBe("—");
  });

  qaTest("lib.date.03", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate(undefined)).toBe("—");
  });

  qaTest("lib.date.04", () => {
    const result = formatDate("2025-12-02T10:30:00Z");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
    expect(result).not.toBe("—");
    // Date-only: must not contain a colon (time component)
    expect(result).not.toMatch(/\d{2}:\d{2}/);
  });

  qaTest("lib.date.05", () => {
    expect(formatTime(null)).toBe("—");
    expect(formatTime(undefined)).toBe("—");
  });
});
