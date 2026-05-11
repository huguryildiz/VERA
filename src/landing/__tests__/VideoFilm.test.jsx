import { describe, expect, vi, beforeAll } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { qaTest } from "@/test/qaTest";

beforeAll(() => {
  global.IntersectionObserver = vi.fn(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));
});

import VideoFilm from "../components/VideoFilm";

describe("VideoFilm", () => {
  qaTest("coverage.landing.video-film-renders-poster-initially", () => {
    const { container } = render(<VideoFilm />);
    expect(
      screen.getByRole("button", { name: /Play VERA Product Launch walkthrough/i })
    ).toBeInTheDocument();
    const poster = container.querySelector("img");
    expect(poster).toBeTruthy();
    expect(poster.getAttribute("src")).toMatch(
      /i\.ytimg\.com\/vi\/SrDuMjOD-SY\/maxresdefault\.jpg/
    );
    expect(container.querySelector("iframe")).toBeNull();
  });

  qaTest("coverage.landing.video-film-click-loads-iframe", () => {
    const { container } = render(<VideoFilm />);
    fireEvent.click(
      screen.getByRole("button", { name: /Play VERA Product Launch walkthrough/i })
    );
    const iframe = container.querySelector("iframe");
    expect(iframe).toBeTruthy();
    expect(iframe.getAttribute("src")).toBe(
      "https://www.youtube-nocookie.com/embed/SrDuMjOD-SY?autoplay=1&rel=0&modestbranding=1"
    );
  });
});
