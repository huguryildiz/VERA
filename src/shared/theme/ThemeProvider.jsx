// src/shared/theme/ThemeProvider.jsx
// Dark/light mode provider. Persists preference to localStorage.
// Applies "dark" class to <html> element for Tailwind dark: variants.

import { createContext, useContext, useEffect, useState } from "react";
import { KEYS } from "@/shared/storage/keys";

const ThemeContext = createContext({ theme: "light", setTheme: () => {} });

function applyThemeClass(t) {
  if (typeof document === "undefined") return;
  if (t === "dark") {
    document.documentElement.classList.add("dark");
    document.body.classList.add("dark-mode");
  } else {
    document.documentElement.classList.remove("dark");
    document.body.classList.remove("dark-mode");
  }
}

export function ThemeProvider({ children, defaultTheme = "light" }) {
  const [theme, setTheme] = useState(() => {
    let resolved = defaultTheme;
    try {
      const stored = localStorage.getItem(KEYS.THEME);
      if (stored === "dark" || stored === "light") resolved = stored;
      else if (typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches) resolved = "dark";
    } catch {}
    // Apply synchronously so children see the correct class on their first render
    applyThemeClass(resolved);
    return resolved;
  });

  useEffect(() => {
    applyThemeClass(theme);
    try { localStorage.setItem(KEYS.THEME, theme); } catch {}
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
