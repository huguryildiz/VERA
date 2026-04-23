import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { qaTest } from "@/test/qaTest";

vi.mock("../../../shared/SpotlightTour", () => ({
  default: () => null,
}));

import PinRevealStep from "../PinRevealStep";

function makeState(overrides = {}) {
  return {
    issuedPin: "1234",
    handlePinRevealContinue: vi.fn(),
    ...overrides,
  };
}

describe("PinRevealStep", () => {
  qaTest("jury.step.pinreveal.01", () => {
    const state = makeState();
    render(<PinRevealStep state={state} onBack={vi.fn()} />);
    expect(screen.getByText("Your Session PIN")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  qaTest("jury.step.pinreveal.02", () => {
    const state = makeState();
    render(<PinRevealStep state={state} onBack={vi.fn()} />);
    fireEvent.click(screen.getByText("Begin Evaluation"));
    expect(state.handlePinRevealContinue).toHaveBeenCalled();
  });
});
