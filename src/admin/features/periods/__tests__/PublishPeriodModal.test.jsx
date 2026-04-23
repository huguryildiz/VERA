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

import PublishPeriodModal from "../PublishPeriodModal";

const PERIOD = { id: "p-001", name: "Spring 2026" };

describe("PublishPeriodModal", () => {
  qaTest("modal.publishPeriod.01", () => {
    render(
      <PublishPeriodModal
        open
        onClose={vi.fn()}
        period={PERIOD}
        onPublish={vi.fn()}
      />
    );

    expect(screen.getByText("Publish Evaluation Period?")).toBeInTheDocument();
    expect(screen.getByText("Spring 2026")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /publish period/i })).toBeInTheDocument();
  });

  qaTest("modal.publishPeriod.02", () => {
    const onPublish = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(
      <PublishPeriodModal
        open
        onClose={onClose}
        period={PERIOD}
        onPublish={onPublish}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /publish period/i }));
    expect(onPublish).toHaveBeenCalledTimes(1);
  });
});
