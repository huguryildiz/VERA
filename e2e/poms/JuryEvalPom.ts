import type { Locator } from "@playwright/test";
import { expect } from "@playwright/test";
import { BasePom } from "./BasePom";

export class JuryEvalPom extends BasePom {
  scoreInput(criterionId: string): Locator {
    return this.byTestId(`jury-eval-score-${criterionId}`);
  }

  allScoreInputs(): Locator {
    return this.page.locator('[data-testid^="jury-eval-score-"]');
  }

  submitBtn(): Locator {
    return this.byTestId("jury-eval-submit");
  }

  confirmSubmitBtn(): Locator {
    return this.byTestId("jury-eval-confirm-submit");
  }

  confirmCancelBtn(): Locator {
    return this.byTestId("jury-eval-confirm-cancel");
  }

  saveStatus(): Locator {
    return this.byTestId("jury-eval-save-status");
  }

  async waitForEvalStep(): Promise<void> {
    await this.page.waitForURL(/\/demo\/jury\/evaluate/);
    await expect(this.allScoreInputs().first()).toBeVisible({ timeout: 15_000 });
  }

  async fillAllScores(value: string): Promise<void> {
    const inputs = this.allScoreInputs();
    const count = await inputs.count();
    for (let i = 0; i < count; i++) {
      await inputs.nth(i).fill(value);
      await inputs.nth(i).blur();
    }
  }

  async clickSubmit(): Promise<void> {
    await this.submitBtn().click();
  }

  async clickConfirmSubmit(): Promise<void> {
    await this.confirmSubmitBtn().click();
  }
}
