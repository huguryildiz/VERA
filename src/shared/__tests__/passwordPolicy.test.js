import { describe, expect, it } from "vitest";
import { qaTest } from "../../test/qaTest.js";
import {
  evaluatePassword,
  isStrongPassword,
  getStrengthMeta,
  PASSWORD_MIN_LENGTH,
  PASSWORD_REQUIREMENTS,
} from "../passwordPolicy.js";

describe("shared/passwordPolicy", () => {
  qaTest("passwd.01", () => {
    const result = evaluatePassword("Abcdef1@gh");
    expect(result.score).toBe(5);
    expect(result.checks.length).toBe(true);
    expect(result.checks.lower).toBe(true);
    expect(result.checks.upper).toBe(true);
    expect(result.checks.number).toBe(true);
    expect(result.checks.special).toBe(true);
  });

  qaTest("passwd.02", () => {
    expect(evaluatePassword("").score).toBe(0);
    expect(evaluatePassword(null).score).toBe(0);
    // Only lowercase
    const partial = evaluatePassword("abcdefghij");
    expect(partial.score).toBe(2); // length + lower
    expect(partial.checks.lower).toBe(true);
    expect(partial.checks.upper).toBe(false);
    expect(partial.checks.number).toBe(false);
    expect(partial.checks.special).toBe(false);
  });

  qaTest("passwd.03", () => {
    expect(isStrongPassword("Abcdef1@gh")).toBe(true);
    expect(isStrongPassword("password")).toBe(false);
    expect(isStrongPassword("")).toBe(false);
  });

  qaTest("passwd.04", () => {
    const strong = getStrengthMeta(5);
    expect(strong.label).toBe("Very Strong");
    expect(strong.pct).toBe(100);
    expect(strong.color).toBeTruthy();

    const zero = getStrengthMeta(0);
    expect(zero.label).toBe("");
    expect(zero.pct).toBe(0);

    const mid = getStrengthMeta(3);
    expect(mid.label).toBe("Fair");
    expect(mid.pct).toBe(60);
  });

  // Sanity-check constants that drive UI rendering
  it("exports expected constants", () => {
    expect(PASSWORD_MIN_LENGTH).toBe(10);
    expect(PASSWORD_REQUIREMENTS).toHaveLength(5);
    const keys = PASSWORD_REQUIREMENTS.map((r) => r.key);
    expect(keys).toContain("length");
    expect(keys).toContain("special");
  });
});
