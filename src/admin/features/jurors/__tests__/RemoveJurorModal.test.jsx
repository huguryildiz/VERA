import { describe, vi, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { qaTest } from "@/test/qaTest";

vi.mock("@/shared/ui/Modal", () => ({
  default: ({ open, children }) => (open ? <div>{children}</div> : null),
}));
vi.mock("@/shared/ui/AsyncButtonContent", () => ({
  default: ({ children }) => <span>{children}</span>,
}));
vi.mock("@/admin/shared/JurorBadge", () => ({
  default: ({ name }) => <span data-testid="juror-badge">{name}</span>,
}));

import RemoveJurorModal from "../RemoveJurorModal";

const JUROR = { name: "Dr. Smith", affiliation: "TEDU" };
const IMPACT = { scores: 8, groupsAffected: 4, avgScore: "72.5" };

describe("RemoveJurorModal", () => {
  qaTest("modal.removeJuror.01", () => {
    render(
      <RemoveJurorModal
        open
        onClose={vi.fn()}
        juror={JUROR}
        impact={IMPACT}
        onRemove={vi.fn()}
      />
    );

    expect(screen.getByText("Remove Juror?")).toBeInTheDocument();

    const removeBtn = screen.getByRole("button", { name: /remove juror/i });
    expect(removeBtn).toBeDisabled();
  });

  qaTest("modal.removeJuror.02", () => {
    const onClose = vi.fn();
    const onRemove = vi.fn();
    render(
      <RemoveJurorModal
        open
        onClose={onClose}
        juror={JUROR}
        impact={IMPACT}
        onRemove={onRemove}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /keep juror/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onRemove).not.toHaveBeenCalled();
  });
});
