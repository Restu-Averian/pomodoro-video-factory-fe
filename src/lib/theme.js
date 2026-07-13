export const THEME_STORAGE_KEY = "pomodoro-video-factory-theme";

const themes = new Set(["light", "dark", "system"]);

export function getStoredTheme(value) {
  return themes.has(value) ? value : "system";
}

export function resolveTheme(theme, prefersDark) {
  if (theme === "dark") return "dark";
  if (theme === "light") return "light";
  return prefersDark ? "dark" : "light";
}
