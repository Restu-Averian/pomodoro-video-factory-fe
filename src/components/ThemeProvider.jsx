import { createContext, useContext, useEffect, useState } from "react";
import { getStoredTheme, resolveTheme, THEME_STORAGE_KEY } from "@/lib/theme";

const ThemeContext = createContext(null);

function prefersDark() {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

function initialTheme() {
  try {
    return getStoredTheme(window.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return "system";
  }
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(initialTheme);
  const [resolvedTheme, setResolvedTheme] = useState(() =>
    resolveTheme(initialTheme(), prefersDark()),
  );

  useEffect(() => {
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    const apply = () => {
      const resolved = resolveTheme(theme, media?.matches ?? false);
      document.documentElement.classList.toggle("dark", resolved === "dark");
      setResolvedTheme(resolved);
    };

    apply();
    if (theme !== "system" || !media) return undefined;
    media.addEventListener?.("change", apply);
    return () => media.removeEventListener?.("change", apply);
  }, [theme]);

  const setTheme = (nextTheme) => {
    const validTheme = getStoredTheme(nextTheme);
    setThemeState(validTheme);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, validTheme);
    } catch {
      // Storage can be unavailable in private or locked-down browser sessions.
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
