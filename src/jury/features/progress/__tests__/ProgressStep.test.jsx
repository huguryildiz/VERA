import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { qaTest } from "@/test/qaTest";

vi.mock("../../../shared/SpotlightTour", () => ({
  default: () => null,
}));

vi.mock("@/shared/lib/dateUtils", () => ({
  formatDate: (d) => String(d),
}));

import ProgressStep from "../ProgressStep";

function makeState(overrides = {}) {
  return {
    handleProgressContinue: vi.fn(),
    progressCheck: null,
    activeProjectCount: 5,
    effectiveCriteria: [
      { key: "technical", label: "Technical", max: 25, color: "#60a5fa" },
    ],
    resetAll: vi.fn(),
    ...overrides,
  };
}

describe("ProgressStep", () => {
  qaTest("jury.step.progress.01", () => {
    const state = makeState();
    render(<ProgressStep state={state} onBack={vi.fn()} />);
    expect(screen.getByText("Ready to Begin")).toBeInTheDocument();
    expect(screen.getByText("Start Evaluation")).toBeInTheDocument();
  });

  qaTest("jury.step.progress.02", () => {
    const state = makeState({
      progressCheck: { isInProgress: true, groupsCompleted: 2, totalCount: 5, lastWorkedAt: null },
    });
    render(<ProgressStep state={state} onBack={vi.fn()} />);
    expect(screen.getByText("Welcome Back")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Resume Evaluation"));
    expect(state.handleProgressContinue).toHaveBeenCalled();
  });
});
