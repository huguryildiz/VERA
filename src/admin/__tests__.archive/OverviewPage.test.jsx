import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes, Outlet } from "react-router-dom";
import OverviewPage from "../pages/OverviewPage";

function makeJuror(idx) {
  return {
    jurorId: `juror-${idx}`,
    juryName: `Juror ${idx}`,
    affiliation: `Affiliation ${idx}`,
    completedProjects: idx % 2,
    totalProjects: 3,
    lastSeenMs: Date.now() - idx * 60000,
    finalSubmitted: false,
    editEnabled: false,
  };
}

function renderWithContext(ctx) {
  function Layout() {
    return <Outlet context={ctx} />;
  }
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<OverviewPage />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe("OverviewPage juror expansion", () => {
  it("expands the live jury activity table", () => {
    const jurors = Array.from({ length: 8 }, (_, idx) => makeJuror(idx + 1));

    renderWithContext({
      rawScores: [],
      summaryData: [],
      allJurors: jurors,
      selectedPeriod: { semester_name: "Spring 2026" },
      loading: false,
      criteriaConfig: [],
      frameworks: [],
    });

    expect(screen.getByText("5 of 8 jurors shown")).toBeInTheDocument();

    const table = document.getElementById("overview-juror-table");
    expect(table).not.toBeNull();
    expect(table.classList.contains("expanded")).toBe(false);

    const rowsBefore = within(table).getAllByRole("row");
    expect(rowsBefore).toHaveLength(6);

    fireEvent.click(screen.getByText(/view all 8 jurors/i));

    expect(screen.getByText("8 of 8 jurors shown")).toBeInTheDocument();
    expect(table.classList.contains("expanded")).toBe(true);

    const rowsAfter = within(table).getAllByRole("row");
    expect(rowsAfter).toHaveLength(9);
  });
});
