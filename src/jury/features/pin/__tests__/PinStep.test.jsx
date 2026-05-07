import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { qaTest } from "@/test/qaTest";

vi.mock("@/shared/ui/FbAlert", () => ({
  default: ({ children }) => <div data-testid="fb-alert">{children}</div>,
}));

vi.mock("../../../shared/SpotlightTour", () => ({
  default: () => null,
}));

import PinStep from "../PinStep";

function makeState(overrides = {}) {
  return {
    handlePinSubmit: vi.fn(),
    pinError: "",
    pinErrorCode: "",
    pinAttemptsLeft: 5,
    pinMaxAttempts: 5,
    pinLockedUntil: null,
    ...overrides,
  };
}

describe("PinStep", () => {
  qaTest("jury.step.pin.01", () => {
    const state = makeState();
    render(<PinStep state={state} onBack={vi.fn()} />);
    expect(screen.getByText("Enter Your PIN")).toBeInTheDocument();
    expect(screen.getByText("Verify PIN")).toBeInTheDocument();
  });

  qaTest("jury.step.pin.02", () => {
    const state = makeState({ pinError: "Incorrect PIN — 4 attempts remaining", pinErrorCode: "invalid", pinAttemptsLeft: 4 });
    render(<PinStep state={state} onBack={vi.fn()} />);
    expect(screen.getByTestId("fb-alert")).toBeInTheDocument();
  });
});
