import { describe, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { qaTest } from "@/test/qaTest";

import SortIconEntryControl from "../features/entry-control/components/SortIcon";
import SortIconJurors from "../features/jurors/components/SortIcon";
import SortIconOrgs from "../features/organizations/components/SortIcon";
import SortIconPeriods from "../features/periods/components/SortIcon";
import SortIconProjects from "../features/projects/components/SortIcon";
import SortIconRankings from "../features/rankings/components/SortIcon";

describe("SortIcon (all variants)", () => {
  qaTest("coverage.sort-icon.inactive", () => {
    render(
      <SortIconEntryControl colKey="name" sortKey="date" sortDir="asc" />
    );
    const span = screen.getByText("▲");
    expect(span.className).toContain("sort-icon-inactive");
  });

  qaTest("coverage.sort-icon.active-asc", () => {
    render(
      <SortIconJurors colKey="name" sortKey="name" sortDir="asc" />
    );
    const span = screen.getByText("▲");
    expect(span.className).toContain("sort-icon-active");
  });

  qaTest("coverage.sort-icon.active-desc", () => {
    render(
      <SortIconProjects colKey="title" sortKey="title" sortDir="desc" />
    );
    const span = screen.getByText("▼");
    expect(span.className).toContain("sort-icon-active");
  });
});

describe("SortIcon (orgs, periods, rankings variants — render smoke)", () => {
  qaTest("coverage.sort-icon.inactive", () => {
    render(<SortIconOrgs colKey="a" sortKey="b" sortDir="asc" />);
    expect(screen.getByText("▲")).toBeInTheDocument();
  });

  qaTest("coverage.sort-icon.inactive", () => {
    render(<SortIconPeriods colKey="a" sortKey="b" sortDir="asc" />);
    expect(screen.getByText("▲")).toBeInTheDocument();
  });

  qaTest("coverage.sort-icon.active-asc", () => {
    render(
      <SortIconRankings field="score" sortField="score" sortDir="asc" />
    );
    expect(screen.getByText("▲")).toBeInTheDocument();
  });
});
