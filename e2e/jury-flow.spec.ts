// e2e/jury-flow.spec.ts
// ============================================================
// Jury identity form — E2E smoke tests.
//
// These tests run against a live dev server connected to the
// staging Supabase project (E2E_SUPABASE_URL / E2E_SUPABASE_ANON_KEY).
//
// PIN-dependent steps are kept in a separate describe block so
// they can be skipped when test credentials are not configured.
// ============================================================

import { test, expect } from "@playwright/test";

const TEST_JUROR_NAME  = process.env.E2E_JUROR_NAME  || "";
const TEST_JUROR_DEPT  = process.env.E2E_JUROR_DEPT  || "";
const TEST_JUROR_PIN   = process.env.E2E_JUROR_PIN   || "";
const SEMESTER_NAME    = process.env.E2E_SEMESTER_NAME || "";

test.describe("Jury identity form", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Navigate to the jury form
    await page.getByRole("button", { name: /start evaluation/i }).click();
  });

  test("Start button is disabled when fields are empty", async ({ page }) => {
    const startBtn = page.getByRole("button", { name: /start evaluation/i });
    await expect(startBtn).toBeDisabled();
  });

  test("Start button is enabled when both fields are filled", async ({ page }) => {
    await page.getByLabel(/full name/i).fill("Test Juror");
    await page.getByLabel(/institution \/ department/i).fill("EE");
    const startBtn = page.getByRole("button", { name: /start evaluation/i });
    await expect(startBtn).toBeEnabled();
  });

  test("Name field accepts text input", async ({ page }) => {
    const nameInput = page.getByLabel(/full name/i);
    await nameInput.fill("Jane Smith");
    await expect(nameInput).toHaveValue("Jane Smith");
  });
});

// ── jury.e2e.01 — Full flow: identity → PIN → semester → eval screen ──────

test.describe("Full jury evaluation flow", () => {
  test.skip(
    !TEST_JUROR_NAME || !TEST_JUROR_PIN || !SEMESTER_NAME,
    "Skipped: E2E_JUROR_NAME / E2E_JUROR_PIN / E2E_SEMESTER_NAME not set"
  );

  test("jury.e2e.01 juror reaches evaluation screen", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /start evaluation/i }).click();

    // InfoStep
    await page.getByLabel(/full name/i).fill(TEST_JUROR_NAME);
    await page.getByLabel(/institution \/ department/i).fill(TEST_JUROR_DEPT || "EE");
    await page.getByRole("button", { name: /start evaluation/i }).click();

    // PinStep — enter each digit individually
    const digits = TEST_JUROR_PIN.split("");
    for (let i = 0; i < digits.length; i++) {
      await page.getByLabel(`Digit ${i + 1} of 4`).fill(digits[i]);
    }
    await page.getByRole("button", { name: /verify pin/i }).click();

    // SemesterStep — click if visible (skipped when juror has only one active semester)
    const semesterBtn = page.getByRole("button", { name: new RegExp(SEMESTER_NAME, "i") });
    const semesterVisible = await semesterBtn.isVisible({ timeout: 3_000 }).catch(() => false);
    if (semesterVisible) await semesterBtn.click();

    // EvalStep — at least one score input must be visible
    await expect(
      page.getByLabel(/score for/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });
});

// ── Jury PIN flow (legacy smoke) ─────────────────────────────────────────

test.describe("Jury PIN flow", () => {
  test.skip(
    !TEST_JUROR_NAME || !TEST_JUROR_PIN,
    "Skipped: E2E_JUROR_NAME / E2E_JUROR_PIN not set"
  );

  test("Known juror reaches PIN step after identity submit", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /start evaluation/i }).click();

    await page.getByLabel(/full name/i).fill(TEST_JUROR_NAME);
    await page.getByLabel(/institution \/ department/i).fill(TEST_JUROR_DEPT);
    await page.getByRole("button", { name: /start evaluation/i }).click();

    // After identity submit with a known juror, a PIN step should appear
    // (either PinStep "Enter your access PIN" or PinRevealStep "Your Access PIN")
    await expect(page.getByText(/your access pin/i)).toBeVisible({ timeout: 10_000 });
  });
});
