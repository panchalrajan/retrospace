import { describe, expect, it } from "vitest";
import { getNextColorMode, parseThemePreference, resolveColorMode } from "./color-mode";

describe("color mode preferences", () => {
  it("uses the system preference when no override is saved", () => {
    expect(parseThemePreference(null)).toBe("system");
    expect(resolveColorMode("system", "light")).toBe("light");
    expect(resolveColorMode("system", "dark")).toBe("dark");
  });

  it("keeps an explicit user choice independent of the system preference", () => {
    expect(parseThemePreference("light")).toBe("light");
    expect(parseThemePreference("dark")).toBe("dark");
    expect(resolveColorMode("light", "dark")).toBe("light");
    expect(resolveColorMode("dark", "light")).toBe("dark");
  });

  it("switches directly between light and dark modes", () => {
    expect(getNextColorMode("light")).toBe("dark");
    expect(getNextColorMode("dark")).toBe("light");
  });
});
