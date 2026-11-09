export const ATLASSIAN_THEME = {
  light: "light",
  dark: "dark",
  spacing: "spacing",
  typography: "typography",
  shape: "shape",
  motion: "motion",
} as const;

export const ATLASSIAN_THEME_ATTRIBUTE = Object.entries(ATLASSIAN_THEME)
  .map(([kind, theme]) => `${kind}:${theme}`)
  .join(" ");
