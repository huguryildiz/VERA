import { test, expect } from "@playwright/test";
import { JuryPom } from "../poms/JuryPom";
import { readJurorAuth, resetJurorAuth } from "../helpers/supabaseAdmin";
import { EVAL_JURORS, EVAL_PERIOD_ID } from "../fixtures/seed-ids";

test.describe("jury lock screen", () => {
  test.describe.configure({ mode: "serial" });

  test("blocked juror sees locked screen after PIN submit", async ({ page }) => {
    const jury = new JuryPom(page);
    await jury.goto();
    await jury.waitForArrivalStep();
    await jury.clickBeginSession();
    await jury.waitForIdentityStep();
    await jury.fillIdentity("E2E Locked Juror", "E2E Test");
    await jury.submitIdentity();
    await jury.waitForPinStep();
    await jury.fillPin("9999");
    await jury.submitPin();
    await jury.waitForLockedStep();
    await expect(jury.lockedScreen()).toBeVisible();
  });

  // ── C3: PIN lifecycle ───────────────────────────────────────────────────────

  test("3 failed PIN attempts → locked screen + DB state", async ({ page }) => {
    const jurorId = EVAL_JURORS[0].id;
    await resetJurorAuth(jurorId, EVAL_PERIOD_ID);

    await page.addInitScript(() => {
      try {
        sessionStorage.setItem("dj_tour_done", "1");
        sessionStorage.setItem("dj_tour_pin_step", "1");
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
    await jury.fillIdentity("E2E Eval Render", "E2E Org");
    await jury.submitIdentity();
    await jury.waitForPinStep();

    // Attempt 1 — wrong PIN
    await jury.fillPin("0000");
    await jury.submitPin();
    // Wait for submitting→false: button text returns to "Verify PIN" after each RPC cycle.
    // Waiting on pinInput(0).toHaveValue("") is unreliable because the useEffect that clears
    // inputs watches [state.pinError] — when two consecutive attempts return the same error
    // code, the effect does not re-fire and inputs are not cleared until a new value arrives.
    await expect(jury.pinSubmit()).toContainText("Verify PIN", { timeout: 8_000 });

    // Attempt 2 — wrong PIN
    await jury.fillPin("0000");
    await jury.submitPin();
    await expect(jury.pinSubmit()).toContainText("Verify PIN", { timeout: 8_000 });

    // Attempt 3 — wrong PIN → triggers lockout
    await jury.fillPin("0000");
    await jury.submitPin();
    await jury.waitForLockedStep();
    await expect(jury.lockedScreen()).toBeVisible();

    const auth = await readJurorAuth(jurorId, EVAL_PERIOD_ID);
    expect(auth.failed_attempts).toBe(3);
    expect(new Date(auth.locked_until!).getTime()).toBeGreaterThan(Date.now());
  });
});
