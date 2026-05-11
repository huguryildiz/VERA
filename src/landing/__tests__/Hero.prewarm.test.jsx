import { describe, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { qaTest } from "@/test/qaTest";

const { MOCK_FROM, MOCK_SELECT, MOCK_DEMO_CLIENT } = vi.hoisted(() => {
  const MOCK_SELECT = vi.fn();
  const MOCK_FROM = vi.fn(() => ({ select: MOCK_SELECT }));
  const MOCK_DEMO_CLIENT = { from: MOCK_FROM };
  return { MOCK_FROM, MOCK_SELECT, MOCK_DEMO_CLIENT };
});

vi.mock("@/shared/lib/supabaseClient", () => ({
  supabase: {},
  getDemoClient: () => MOCK_DEMO_CLIENT,
  clearPersistedSession: vi.fn(),
}));

vi.mock("@/shared/theme/ThemeProvider", () => ({
  useTheme: () => ({ theme: "dark", setTheme: () => {} }),
}));

import Hero from "../components/Hero.jsx";

function renderHero() {
  return render(
    <MemoryRouter>
      <Hero />
    </MemoryRouter>
  );
}

describe("landing/Hero/prewarm-ping", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    MOCK_FROM.mockClear();
    MOCK_SELECT.mockClear();
    MOCK_SELECT.mockResolvedValue({ count: 1, error: null });
    sessionStorage.removeItem("vera.demo_prewarm_fired");
  });

  afterEach(() => {
    vi.useRealTimers();
    sessionStorage.removeItem("vera.demo_prewarm_fired");
  });

  qaTest("landing.prewarm.01", async () => {
    renderHero();
    expect(MOCK_FROM).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    expect(MOCK_FROM).toHaveBeenCalledWith("organizations");
    expect(MOCK_SELECT).toHaveBeenCalledWith("id", { count: "estimated", head: true });
  });

  qaTest("landing.prewarm.02", async () => {
    sessionStorage.setItem("vera.demo_prewarm_fired", "1");
    renderHero();

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(MOCK_FROM).not.toHaveBeenCalled();
  });

  qaTest("landing.prewarm.03", async () => {
    const { unmount } = renderHero();
    unmount();

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(MOCK_FROM).not.toHaveBeenCalled();
  });
});
