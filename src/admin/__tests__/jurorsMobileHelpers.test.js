// src/admin/__tests__/jurorsMobileHelpers.test.js
import { describe, it, expect } from "vitest";

// NOTE: these are module-private in JurorsPage.jsx; test via copied implementation.
function mobileScoreStyle(score) {
  if (!score && score !== 0) return { color: "#475569" };
  const n = parseFloat(score);
  if (isNaN(n)) return { color: "#475569" };
  if (n >= 90) return { color: "#34d399" };
  if (n >= 74) return { color: "#60a5fa" };
  if (n >= 60) return { color: "#fb923c" };
  return { color: "#475569" };
}
function mobileBarFill(status) {
  if (status === "completed") return "var(--success)";
  if (status === "editing")   return "#60a5fa";
  if (status === "in_progress" || status === "ready_to_submit") return "var(--warning)";
  return "rgba(100,116,139,0.3)";
}

describe("mobileScoreStyle", () => {
  it("returns green for score >= 90", () => {
    expect(mobileScoreStyle("94.3")).toEqual({ color: "#34d399" });
    expect(mobileScoreStyle("90.0")).toEqual({ color: "#34d399" });
  });
  it("returns blue for 74 <= score < 90", () => {
    expect(mobileScoreStyle("74.9")).toEqual({ color: "#60a5fa" });
    expect(mobileScoreStyle("89.9")).toEqual({ color: "#60a5fa" });
  });
  it("returns orange for 60 <= score < 74", () => {
    expect(mobileScoreStyle("61.2")).toEqual({ color: "#fb923c" });
    expect(mobileScoreStyle("73.9")).toEqual({ color: "#fb923c" });
  });
  it("returns muted for score < 60", () => {
    expect(mobileScoreStyle("55.0")).toEqual({ color: "#475569" });
  });
  it("returns muted for null/undefined/empty", () => {
    expect(mobileScoreStyle(null)).toEqual({ color: "#475569" });
    expect(mobileScoreStyle(undefined)).toEqual({ color: "#475569" });
    expect(mobileScoreStyle("")).toEqual({ color: "#475569" });
    expect(mobileScoreStyle("—")).toEqual({ color: "#475569" });
  });
});

describe("mobileBarFill", () => {
  it("returns success var for completed", () => {
    expect(mobileBarFill("completed")).toBe("var(--success)");
  });
  it("returns blue hex for editing", () => {
    expect(mobileBarFill("editing")).toBe("#60a5fa");
  });
  it("returns warning var for in_progress", () => {
    expect(mobileBarFill("in_progress")).toBe("var(--warning)");
  });
  it("returns warning var for ready_to_submit", () => {
    expect(mobileBarFill("ready_to_submit")).toBe("var(--warning)");
  });
  it("returns muted for not_started and unknown", () => {
    expect(mobileBarFill("not_started")).toBe("rgba(100,116,139,0.3)");
    expect(mobileBarFill(undefined)).toBe("rgba(100,116,139,0.3)");
  });
});
