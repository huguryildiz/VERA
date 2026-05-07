import { describe, vi, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { qaTest } from "@/test/qaTest";

vi.mock("@/shared/ui/Modal", () => ({
  default: ({ open, children }) => (open ? <div>{children}</div> : null),
}));
vi.mock("@/shared/ui/AsyncButtonContent", () => ({
  default: ({ children }) => <span>{children}</span>,
}));
vi.mock("@/shared/api", () => ({
  getPeriodCounts: vi.fn().mockResolvedValue({ project_count: 3, juror_count: 5, score_count: 12 }),
}));

import DeletePeriodModal from "../DeletePeriodModal";

const PERIOD = { id: "p-001", name: "Spring 2026" };

describe("DeletePeriodModal", () => {
  qaTest("modal.deletePeriod.01", () => {
    render(
      <DeletePeriodModal
        open
        onClose={vi.fn()}
        period={PERIOD}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText("Delete Period?")).toBeInTheDocument();

    const deleteBtn = screen.getByRole("button", { name: /delete period/i });
    expect(deleteBtn).toBeDisabled();
  });

  qaTest("modal.deletePeriod.02", () => {
    const onClose = vi.fn();
    const onDelete = vi.fn();
    render(
      <DeletePeriodModal
        open
        onClose={onClose}
        period={PERIOD}
        onDelete={onDelete}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /keep period/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onDelete).not.toHaveBeenCalled();
  });

  qaTest("modal.deletePeriod.03", () => {
    render(
      <DeletePeriodModal
        open
        onClose={vi.fn()}
        period={PERIOD}
        onDelete={vi.fn()}
      />
    );

    const deleteBtn = screen.getByRole("button", { name: /delete period/i });
    expect(deleteBtn).toBeDisabled();

    const input = screen.getByPlaceholderText(/type spring 2026 to confirm/i);
    fireEvent.change(input, { target: { value: "Spring 2026" } });

    expect(deleteBtn).not.toBeDisabled();
  });
});
