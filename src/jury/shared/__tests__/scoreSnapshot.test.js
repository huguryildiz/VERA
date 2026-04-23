import { describe, it, expect } from "vitest";
import { qaTest } from "@/test/qaTest";
import {
  buildScoreSnapshot,
  isPeriodLockedError,
  isFinalSubmittedError,
  isSessionExpiredError,
} from "../scoreSnapshot";

const CRITERIA = [
  { key: "technical", max: 25 },
  { key: "design", max: 25 },
];

describe("scoreSnapshot", () => {
  qaTest("jury.snapshot.01", () => {
    const snap1 = buildScoreSnapshot({ technical: 20, design: 15 }, "good work", CRITERIA);
    const snap2 = buildScoreSnapshot({ technical: 20, design: 15 }, "good work", CRITERIA);
    expect(snap1.key).toBe(snap2.key);
    expect(snap1.normalizedScores).toEqual({ technical: 20, design: 15 });
    expect(snap1.hasAnyScores).toBe(true);
    expect(snap1.hasComment).toBe(true);
  });

  qaTest("jury.snapshot.02", () => {
    const snap1 = buildScoreSnapshot({ technical: 20, design: 15 }, "", CRITERIA);
    const snap2 = buildScoreSnapshot({ technical: 20, design: 10 }, "", CRITERIA);
    expect(snap1.key).not.toBe(snap2.key);
  });

  it("isPeriodLockedError — matches exact message", () => {
    expect(isPeriodLockedError({ message: "period_locked" })).toBe(true);
    expect(isPeriodLockedError({ message: "other" })).toBe(false);
    expect(isPeriodLockedError(null)).toBe(false);
  });

  it("isFinalSubmittedError — matches exact message", () => {
    expect(isFinalSubmittedError({ message: "final_submit_required" })).toBe(true);
    expect(isFinalSubmittedError({ message: "other" })).toBe(false);
  });

  it("isSessionExpiredError — matches P0401 + known messages", () => {
    expect(isSessionExpiredError({ code: "P0401", message: "juror_session_expired" })).toBe(true);
    expect(isSessionExpiredError({ code: "P0401", message: "juror_session_missing" })).toBe(true);
    expect(isSessionExpiredError({ code: "P0001", message: "juror_session_expired" })).toBe(false);
    expect(isSessionExpiredError({ code: "P0401", message: "other" })).toBe(false);
  });
});
