// e2e/jury-lock.spec.ts
// ============================================================
// jury.e2e.02 — Semester locked → lock banner visible, inputs disabled.
//
// Assumes E2E demo DB has the target semester locked
// (edit_allowed = false, lock_active = true for the test juror).
//
// Required env vars:
//   E2E_JUROR_NAME       — juror identity name
//   E2E_JUROR_DEPT       — juror institution/department
//   E2E_JUROR_PIN        — 4-digit PIN
//   E2E_SEMESTER_NAME    — semester name to select (must be locked)
//   E2E_LOCKED=true      — opt-in flag confirming demo DB is locked
// ============================================================

import { test, expect } from "@playwright/test";

const TEST_JUROR_NAME = process.env.E2E_JUROR_NAME  || "";
const TEST_JUROR_DEPT = process.env.E2E_JUROR_DEPT  || "";
const TEST_JUROR_PIN  = process.env.E2E_JUROR_PIN   || "";
const SEMESTER_NAME   = process.env.E2E_SEMESTER_NAME || "";
const LOCKED          = process.env.E2E_LOCKED === "true";

test.describe("Jury lock behavior", () => {
  test.skip(
    !TEST_JUROR_PIN || !SEMESTER_NAME || !LOCKED,
    "Skipped: E2E_JUROR_PIN / E2E_SEMESTER_NAME / E2E_LOCKED=true not set"
  );

  test("jury.e2e.02 locked semester shows lock banner and disabled inputs", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /start evaluation/i }).click();

    // InfoStep
    await page.getByLabel(/full name/i).fill(TEST_JUROR_NAME);
    await page.getByLabel(/institution \/ department/i).fill(TEST_JUROR_DEPT || "EE");
    await page.getByRole("button", { name: /start evaluation/i }).click();

    // PinStep
    const digits = TEST_JUROR_PIN.split("");
    for (let i = 0; i < digits.length; i++) {
      await page.getByLabel(`Digit ${i + 1} of 4`).fill(digits[i]);
    }
    await page.getByRole("button", { name: /verify pin/i }).click();

    // SemesterStep
    await page.getByRole("button", { name: new RegExp(SEMESTER_NAME, "i") }).click();

    // EvalStep — lock banner must be visible
    await expect(
      page.getByRole("status").filter({ hasText: /locked/i })
        .or(page.getByText(/locked/i).first())
    ).toBeVisible({ timeout: 10_000 });

    // Score inputs must be disabled
    const scoreInput = page.getByLabel(/score for/i).first();
    await expect(scoreInput).toBeVisible({ timeout: 5_000 });
    await expect(scoreInput).toBeDisabled();
  });
});
