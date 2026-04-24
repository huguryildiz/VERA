import { test, expect } from "@playwright/test";
import { JuryPom } from "../poms/JuryPom";
import { JuryEvalPom } from "../poms/JuryEvalPom";
import { JuryCompletePom } from "../poms/JuryCompletePom";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Dedicated jurors pre-seeded in demo DB with PIN "9999"
const EVAL_JURORS = [
  { id: "b3aa250b-3049-4788-9c68-5fa0e8aec86a", name: "E2E Eval Render" },
  { id: "bbbbbbbb-e2e0-4000-b000-000000000001", name: "E2E Eval Blur" },
  { id: "bbbbbbbb-e2e0-4000-b000-000000000002", name: "E2E Eval Submit" },
];
const EVAL_PERIOD_ID = "a0d6f60d-ece4-40f8-aca2-955b4abc5d88";

test.describe("jury evaluate flow", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ request }) => {
    for (const { id } of EVAL_JURORS) {
      await request.patch(
        `${SUPABASE_URL}/rest/v1/juror_period_auth?juror_id=eq.${id}&period_id=eq.${EVAL_PERIOD_ID}`,
        {
          headers: {
            apikey: SERVICE_KEY,
            Authorization: `Bearer ${SERVICE_KEY}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          data: { failed_attempts: 0, locked_until: null, final_submitted_at: null },
        },
      );
    }
  });

  async function navigateToEval(
    page: Parameters<Parameters<typeof test>[1]>[0]["page"],
    jurorName: string,
  ) {
    // Suppress all jury SpotlightTour steps so they never block interactions.
    await page.addInitScript(() => {
      try {
        sessionStorage.setItem("dj_tour_done", "1");
        sessionStorage.setItem("dj_tour_eval", "1");
        sessionStorage.setItem("dj_tour_rubric", "1");
        sessionStorage.setItem("dj_tour_confirm", "1");
      } catch {}
    });
    const jury = new JuryPom(page);
    await jury.goto();
    await jury.waitForArrivalStep();
    await jury.clickBeginSession();
    await jury.waitForIdentityStep();
    await jury.fillIdentity(jurorName, "E2E Org");
    await jury.submitIdentity();
    await jury.waitForPinStep();
    await jury.fillPin("9999");
    await jury.submitPin();
    await jury.waitForProgressStep();
    await jury.progressAction().click();
    return new JuryEvalPom(page);
  }

  test("eval step renders score inputs", async ({ page }) => {
    const evalPom = await navigateToEval(page, "E2E Eval Render");
    await evalPom.waitForEvalStep();
    const count = await evalPom.allScoreInputs().count();
    expect(count).toBeGreaterThan(0);
  });

  test("blur after score fill triggers autosave status", async ({ page }) => {
    const evalPom = await navigateToEval(page, "E2E Eval Blur");
    await evalPom.waitForEvalStep();
    const firstInput = evalPom.allScoreInputs().first();
    await firstInput.fill("7");
    await firstInput.blur();
    await expect(evalPom.saveStatus()).toBeVisible();
  });

  test("all projects scored → all-complete banner visible", async ({ page }) => {
    // Uses E2E Eval Submit juror (1 project) so fillAllScores covers all criteria.
    const evalPom = await navigateToEval(page, "E2E Eval Submit");
    await evalPom.waitForEvalStep();
    await evalPom.fillAllScores("5");
    await expect(evalPom.allCompleteBanner()).toBeVisible({ timeout: 5_000 });
  });

  test("back button navigates to progress step", async ({ page }) => {
    const jury = new JuryPom(page);
    const evalPom = await navigateToEval(page, "E2E Eval Render");
    await evalPom.waitForEvalStep();
    await evalPom.clickBack();
    await expect(jury.progressTitle()).toBeVisible({ timeout: 5_000 });
  });

  test("fill all scores → confirm submission → complete screen", async ({ page }) => {
    const evalPom = await navigateToEval(page, "E2E Eval Submit");
    await evalPom.waitForEvalStep();
    await evalPom.fillAllScores("5");
    await evalPom.clickSubmit();
    await expect(evalPom.confirmSubmitBtn()).toBeVisible();
    await evalPom.clickConfirmSubmit();
    const complete = new JuryCompletePom(page);
    await complete.waitForCompleteStep();
    await complete.expectCompletionScreen();
  });
});
