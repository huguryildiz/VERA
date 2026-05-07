import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { qaTest } from "@/test/qaTest";

// ArrivalStep imports image assets — mock them
vi.mock("../../../assets/vera_logo_dark.png", () => ({ default: "logo-dark.png" }));
vi.mock("../../../assets/vera_logo_white.png", () => ({ default: "logo-white.png" }));
vi.mock("../ArrivalStep.css", () => ({}));

import ArrivalStep from "../ArrivalStep";

function makeState(overrides = {}) {
  return {
    setStep: vi.fn(),
    currentPeriodInfo: null,
    orgName: "",
    activeProjectCount: 0,
    ...overrides,
  };
}

describe("ArrivalStep", () => {
  qaTest("jury.step.arrival.01", () => {
    const state = makeState();
    render(<ArrivalStep state={state} onBack={vi.fn()} />);
    expect(screen.getByText("Begin jury session")).toBeInTheDocument();
  });

  qaTest("jury.step.arrival.02", () => {
    const state = makeState();
    const onBack = vi.fn();
    render(<ArrivalStep state={state} onBack={onBack} />);
    fireEvent.click(screen.getByText("Begin jury session"));
    expect(state.setStep).toHaveBeenCalledWith("identity");
  });
});
