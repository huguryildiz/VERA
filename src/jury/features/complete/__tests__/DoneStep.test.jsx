import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { qaTest } from "@/test/qaTest";

const { mockSubmitJuryFeedback, mockRequestScoreEdit } = vi.hoisted(() => ({
  mockSubmitJuryFeedback: vi.fn().mockResolvedValue({}),
  mockRequestScoreEdit: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/shared/api", () => ({
  submitJuryFeedback: mockSubmitJuryFeedback,
  requestScoreEdit: mockRequestScoreEdit,
}));

import DoneStep from "../DoneStep";

function makeState(overrides = {}) {
  return {
    juryName: "Jane Doe",
    affiliation: "TEDU",
    periodId: "p1",
    jurorSessionToken: "tok-1",
    projects: [
      { project_id: "proj-1", title: "Smart Home", avg_score: 85 },
    ],
    effectiveCriteria: [{ id: "technical", max: 100 }],
    clearLocalSession: vi.fn(),
    ...overrides,
  };
}

describe("DoneStep", () => {
  qaTest("jury.step.complete.01", () => {
    const state = makeState();
    render(<DoneStep state={state} onBack={vi.fn()} />);
    expect(screen.getByText(/Thank you, Jane Doe/i)).toBeInTheDocument();
    expect(screen.getByText(/1 groups/i)).toBeInTheDocument();
  });
});
