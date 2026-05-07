import { describe, expect } from "vitest";
import { qaTest } from "../../../test/qaTest.js";
import { LOCKED_ACTIONS, LOCK_TOOLTIP_GRACE, LOCK_TOOLTIP_EXPIRED } from "../lockedActions.js";

describe("auth/shared/lockedActions", () => {
  qaTest("shared.lockedActions.01", () => {
    expect(Object.isFrozen(LOCKED_ACTIONS)).toBe(true);
    expect(LOCKED_ACTIONS.JUROR_INVITE).toBe("juror_invite");
    expect(LOCKED_ACTIONS.ADMIN_INVITE).toBe("admin_invite");
    expect(LOCKED_ACTIONS.GENERATE_ENTRY_TOKEN).toBe("generate_entry_token");
    expect(LOCKED_ACTIONS.JURY_NOTIFY).toBe("jury_notify");
    expect(LOCKED_ACTIONS.REPORT_EMAIL).toBe("report_email");
    expect(LOCKED_ACTIONS.ARCHIVE_ORGANIZATION).toBe("archive_organization");
    expect(Object.keys(LOCKED_ACTIONS).length).toBe(6);
  });

  qaTest("shared.lockedActions.02", () => {
    expect(typeof LOCK_TOOLTIP_GRACE).toBe("string");
    expect(LOCK_TOOLTIP_GRACE.length).toBeGreaterThan(0);
    expect(typeof LOCK_TOOLTIP_EXPIRED).toBe("string");
    expect(LOCK_TOOLTIP_EXPIRED.length).toBeGreaterThan(0);
  });
});
