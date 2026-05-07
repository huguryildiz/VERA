import { describe, vi, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { qaTest } from "@/test/qaTest";

vi.mock("@/shared/ui/Modal", () => ({
  default: ({ open, children }) => (open ? <div>{children}</div> : null),
}));
vi.mock("@/shared/ui/FbAlert", () => ({
  default: ({ children }) => <div data-testid="fb-alert">{children}</div>,
}));
vi.mock("@/shared/ui/AsyncButtonContent", () => ({
  default: ({ children }) => <span>{children}</span>,
}));
vi.mock("@/shared/ui/CustomSelect", () => ({
  default: ({ value, onChange, options }) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      data-testid="duration-unit"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  ),
}));

import EnableEditingModal from "../EnableEditingModal";

const JUROR = { name: "Dr. Smith", affiliation: "TEDU" };

describe("EnableEditingModal", () => {
  qaTest("modal.enableEditing.01", () => {
    render(
      <EnableEditingModal
        open
        onClose={vi.fn()}
        juror={JUROR}
        onEnable={vi.fn()}
      />
    );

    expect(screen.getByText("Reopen Evaluation")).toBeInTheDocument();

    const reopenBtn = screen.getByRole("button", { name: /reopen/i });
    expect(reopenBtn).toBeDisabled();

    const reasonInput = screen.getByPlaceholderText(/correcting accidental/i);
    fireEvent.change(reasonInput, { target: { value: "ok" } });
    expect(reopenBtn).toBeDisabled();
  });

  qaTest("modal.enableEditing.02", () => {
    const onEnable = vi.fn().mockResolvedValue(undefined);
    render(
      <EnableEditingModal
        open
        onClose={vi.fn()}
        juror={JUROR}
        onEnable={onEnable}
      />
    );

    const reasonInput = screen.getByPlaceholderText(/correcting accidental/i);
    fireEvent.change(reasonInput, { target: { value: "Correcting mismatch" } });

    const reopenBtn = screen.getByRole("button", { name: /reopen/i });
    expect(reopenBtn).not.toBeDisabled();

    fireEvent.click(reopenBtn);
    expect(onEnable).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "Correcting mismatch", durationMinutes: 30 })
    );
  });
});
