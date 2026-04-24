import { describe, expect, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { qaTest } from "../../test/qaTest.js";
import { ThemeProvider, useTheme } from "../theme/ThemeProvider.jsx";

function ThemeConsumer() {
  const { theme, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme-value">{theme}</span>
      <button onClick={() => setTheme("dark")}>dark</button>
      <button onClick={() => setTheme("light")}>light</button>
    </div>
  );
}

describe("shared/theme/ThemeProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
    document.body.classList.remove("dark-mode");
  });

  qaTest("theme.provider.01", () => {
    render(
      <ThemeProvider>
        <p>Hello</p>
      </ThemeProvider>
    );
    expect(document.body.textContent).toContain("Hello");
  });

  qaTest("theme.provider.02", () => {
    render(
      <ThemeProvider defaultTheme="light">
        <ThemeConsumer />
      </ThemeProvider>
    );
    expect(screen.getByTestId("theme-value").textContent).toBe("light");
  });

  qaTest("theme.provider.03", () => {
    render(
      <ThemeProvider defaultTheme="light">
        <ThemeConsumer />
      </ThemeProvider>
    );

    // Toggle to dark
    act(() => {
      screen.getByText("dark").click();
    });
    expect(screen.getByTestId("theme-value").textContent).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.body.classList.contains("dark-mode")).toBe(true);

    // Toggle back to light
    act(() => {
      screen.getByText("light").click();
    });
    expect(screen.getByTestId("theme-value").textContent).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.body.classList.contains("dark-mode")).toBe(false);
  });
});
