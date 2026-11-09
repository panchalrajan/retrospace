export type ColorMode = "light" | "dark";
export type ThemePreference = ColorMode | "system";

export function parseThemePreference(value: string | null): ThemePreference {
  return value === "light" || value === "dark" ? value : "system";
}

export function resolveColorMode(preference: ThemePreference, systemMode: ColorMode): ColorMode {
  return preference === "system" ? systemMode : preference;
}

export function getNextColorMode(colorMode: ColorMode): ColorMode {
  return colorMode === "dark" ? "light" : "dark";
}
