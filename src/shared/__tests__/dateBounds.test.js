import { describe, expect } from "vitest";
import { qaTest } from "../../test/qaTest.js";
import {
  isValidDateParts,
  isIsoDateWithinBounds,
  APP_DATE_MIN_YEAR,
  APP_DATE_MAX_YEAR,
} from "../dateBounds.js";

describe("shared/dateBounds", () => {
  qaTest("date.bounds.01", () => {
    expect(isValidDateParts(2025, 6, 15)).toBe(true);
    expect(isValidDateParts(2025, 2, 29)).toBe(false); // 2025 is not a leap year
    expect(isValidDateParts(2024, 2, 29)).toBe(true);  // 2024 is a leap year
    expect(isValidDateParts(2025, 0, 15)).toBe(false);  // month 0 invalid
    expect(isValidDateParts(2025, 13, 1)).toBe(false);  // month 13 invalid
    expect(isValidDateParts(2025, 6, 0)).toBe(false);   // day 0 invalid
    // Year out of bounds
    expect(isValidDateParts(APP_DATE_MIN_YEAR - 1, 6, 15)).toBe(false);
    expect(isValidDateParts(APP_DATE_MAX_YEAR + 1, 6, 15)).toBe(false);
  });

  qaTest("date.bounds.02", () => {
    expect(isIsoDateWithinBounds("2025-06-15")).toBe(true);
    expect(isIsoDateWithinBounds("2000-01-01")).toBe(true);
    expect(isIsoDateWithinBounds("2100-12-31")).toBe(true);

    // Non-string
    expect(isIsoDateWithinBounds(null)).toBe(false);
    expect(isIsoDateWithinBounds(20250615)).toBe(false);

    // Wrong format
    expect(isIsoDateWithinBounds("15/06/2025")).toBe(false);
    expect(isIsoDateWithinBounds("2025-6-15")).toBe(false);
    expect(isIsoDateWithinBounds("abcd-ef-gh")).toBe(false);

    // Calendrically invalid
    expect(isIsoDateWithinBounds("2025-02-30")).toBe(false);

    // Out of bounds
    expect(isIsoDateWithinBounds("1999-12-31")).toBe(false);
    expect(isIsoDateWithinBounds("2101-01-01")).toBe(false);
  });
});
