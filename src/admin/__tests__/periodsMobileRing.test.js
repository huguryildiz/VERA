import { describe, it, expect } from "vitest";
import { computeSetupPercent, computeRingModel } from "../pages/PeriodsPage";

describe("computeSetupPercent", () => {
  it("returns null when readiness is not yet loaded", () => {
    expect(computeSetupPercent(undefined)).toBeNull();
  });

  it("returns 100 when readiness.ok is true", () => {
    expect(computeSetupPercent({ ok: true, issues: [] })).toBe(100);
  });

  it("returns 50 when 3 of 6 required checks are failing", () => {
    const readiness = {
      ok: false,
      issues: [
        { check: "no_criteria", severity: "required", msg: "" },
        { check: "no_projects", severity: "required", msg: "" },
        { check: "no_jurors", severity: "required", msg: "" },
        { check: "some_optional", severity: "optional", msg: "" },
      ],
    };
    expect(computeSetupPercent(readiness)).toBe(50);
  });

  it("returns 0 when all 6 required checks are failing", () => {
    const readiness = {
      ok: false,
      issues: Array.from({ length: 6 }, (_, i) => ({
        check: `c${i}`, severity: "required", msg: "",
      })),
    };
    expect(computeSetupPercent(readiness)).toBe(0);
  });

  it("clamps to 0 if more issues than the fixed total", () => {
    const readiness = {
      ok: false,
      issues: Array.from({ length: 10 }, (_, i) => ({
        check: `c${i}`, severity: "required", msg: "",
      })),
    };
    expect(computeSetupPercent(readiness)).toBe(0);
  });

  it("ignores optional issues", () => {
    const readiness = {
      ok: false,
      issues: [{ check: "x", severity: "optional", msg: "" }],
    };
    expect(computeSetupPercent(readiness)).toBe(100);
  });
});

describe("computeRingModel", () => {
  it("closed state: 100% DONE / ring-closed", () => {
    expect(computeRingModel({ state: "closed" })).toEqual({
      percent: 100, label: "DONE", stateClass: "ring-closed",
    });
  });

  it("live state: uses stats.progress as percent", () => {
    expect(
      computeRingModel({ state: "live", stats: { progress: 42 } })
    ).toEqual({ percent: 42, label: "EVAL", stateClass: "ring-live" });
  });

  it("live state with missing stats: percent null (skeleton)", () => {
    expect(computeRingModel({ state: "live", stats: {} })).toEqual({
      percent: null, label: "EVAL", stateClass: "ring-live",
    });
  });

  it("published (locked, no scores) treated as live at 0", () => {
    expect(computeRingModel({ state: "published" })).toEqual({
      percent: 0, label: "EVAL", stateClass: "ring-live",
    });
  });

  it("draft_incomplete: uses setup %", () => {
    const readiness = { ok: false, issues: [
      { check: "c1", severity: "required", msg: "" },
      { check: "c2", severity: "required", msg: "" },
      { check: "c3", severity: "required", msg: "" },
    ] };
    expect(
      computeRingModel({ state: "draft_incomplete", readiness })
    ).toEqual({ percent: 50, label: "SETUP", stateClass: "ring-draft" });
  });

  it("draft_ready: 100% SETUP", () => {
    expect(
      computeRingModel({ state: "draft_ready", readiness: { ok: true, issues: [] } })
    ).toEqual({ percent: 100, label: "SETUP", stateClass: "ring-draft" });
  });

  it("draft with no readiness yet: percent null", () => {
    expect(computeRingModel({ state: "draft_incomplete" })).toEqual({
      percent: null, label: "SETUP", stateClass: "ring-draft",
    });
  });
});
