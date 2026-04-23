import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route, Outlet } from "react-router-dom";
import { qaTest } from "@/test/qaTest";

const { mockGetJuryAccess } = vi.hoisted(() => ({
  mockGetJuryAccess: vi.fn(),
}));

vi.mock("@/shared/storage", () => ({
  getJuryAccess: mockGetJuryAccess,
}));

import JuryGuard from "../JuryGuard";

function renderWithRouter(initialPath, routes) {
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route element={<JuryGuard />}>
          <Route path="/jury/identity" element={<div>Jury Content</div>} />
          <Route path="/demo/jury/identity" element={<div>Demo Jury Content</div>} />
        </Route>
        <Route path="/eval" element={<div>Eval Gate</div>} />
        <Route path="/demo/eval" element={<div>Demo Eval Gate</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("JuryGuard", () => {
  beforeEach(() => {
    mockGetJuryAccess.mockReset();
  });

  qaTest("jury.guard.01", () => {
    mockGetJuryAccess.mockReturnValue(false);
    renderWithRouter("/jury/identity");
    expect(screen.getByText("Eval Gate")).toBeInTheDocument();
  });

  qaTest("jury.guard.02", () => {
    mockGetJuryAccess.mockReturnValue(true);
    renderWithRouter("/jury/identity");
    expect(screen.getByText("Jury Content")).toBeInTheDocument();
  });

  qaTest("jury.guard.03", () => {
    mockGetJuryAccess.mockReturnValue(false);
    renderWithRouter("/demo/jury/identity");
    expect(screen.getByText("Demo Eval Gate")).toBeInTheDocument();
  });
});
