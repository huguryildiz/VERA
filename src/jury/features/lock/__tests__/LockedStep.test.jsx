import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { qaTest } from "@/test/qaTest";

const { mockRequestPinReset } = vi.hoisted(() => ({
  mockRequestPinReset: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/shared/api/juryApi", () => ({
  requestPinReset: mockRequestPinReset,
}));

import LockedStep from "../LockedStep";

function makeState(overrides = {}) {
  return {
    pinLockedUntil: null,
    periodId: "p1",
    juryName: "Jane",
    affiliation: "TEDU",
    orgName: "TED University",
    tenantAdminEmail: "admin@tedu.edu.tr",
    resetAll: vi.fn(),
    ...overrides,
  };
}

describe("LockedStep", () => {
  qaTest("jury.step.lock.01", () => {
    const state = makeState();
    render(<LockedStep state={state} onBack={vi.fn()} />);
    expect(screen.getByText("Account Temporarily Locked")).toBeInTheDocument();
    expect(screen.getByText("← Start Over")).toBeInTheDocument();
  });
});
