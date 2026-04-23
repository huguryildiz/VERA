import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { qaTest } from "@/test/qaTest";

vi.mock("../../../assets/vera_logo_dark.png", () => ({ default: "logo-dark.png" }));
vi.mock("../../../assets/vera_logo_white.png", () => ({ default: "logo-white.png" }));

vi.mock("@/shared/ui/FbAlert", () => ({
  default: ({ children }) => <div data-testid="fb-alert">{children}</div>,
}));

vi.mock("@/admin/utils/jurorIdentity", () => ({
  jurorInitials: (name) => name.split(" ").map((p) => p[0]).join("").toUpperCase(),
}));

vi.mock("../../../shared/SpotlightTour", () => ({
  default: () => null,
}));

import IdentityStep from "../IdentityStep";

function makeState(overrides = {}) {
  return {
    handleIdentitySubmit: vi.fn(),
    juryName: "",
    affiliation: "",
    authError: "",
    activeProjectCount: 3,
    currentPeriodInfo: { name: "Spring 2026", organizations: { name: "TEDU" } },
    ...overrides,
  };
}

describe("IdentityStep", () => {
  qaTest("jury.step.identity.01", () => {
    const state = makeState();
    render(<IdentityStep state={state} onBack={vi.fn()} />);
    expect(screen.getByText("Jury Information")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Jane Smith/i)).toBeInTheDocument();
  });

  qaTest("jury.step.identity.02", () => {
    const state = makeState();
    render(<IdentityStep state={state} onBack={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText(/Jane Smith/i), {
      target: { value: "Ali Veli" },
    });
    fireEvent.change(screen.getByPlaceholderText(/TED University/i), {
      target: { value: "METU / CS" },
    });
    fireEvent.click(screen.getByText("Start Evaluation"));
    expect(state.handleIdentitySubmit).toHaveBeenCalledWith("Ali Veli", "METU / CS", null);
  });
});
