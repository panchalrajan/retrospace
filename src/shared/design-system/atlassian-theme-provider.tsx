"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import { setGlobalTheme } from "@atlaskit/tokens/set-global-theme";
import { getNextColorMode, parseThemePreference, resolveColorMode, type ColorMode, type ThemePreference } from "./color-mode";
import { ATLASSIAN_THEME } from "./theme-config";

type AtlassianThemeContextValue = {
  colorMode: ColorMode;
  toggleColorMode: () => void;
};

const STORAGE_KEY = "retrospace-color-mode";
const THEME_CHANGE_EVENT = "retrospace-color-mode-change";
const AtlassianThemeContext = createContext<AtlassianThemeContextValue | null>(null);

function readPreference(): ThemePreference {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return parseThemePreference(saved);
  } catch {
    return "system";
  }
}

function applyTheme(preference: ThemePreference): void {
  setGlobalTheme({
    ...ATLASSIAN_THEME,
    colorMode: preference === "system" ? "auto" : preference,
  });
}

function getColorModeSnapshot(): ColorMode {
  const systemMode = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  return resolveColorMode(readPreference(), systemMode);
}

function getServerColorModeSnapshot(): ColorMode {
  return "dark";
}

function subscribeToColorMode(onChange: () => void): () => void {
  const systemPreference = window.matchMedia("(prefers-color-scheme: dark)");
  const updateFromSystem = () => {
    if (readPreference() === "system") {
      applyTheme("system");
      onChange();
    }
  };
  const updateFromStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY && event.key !== null) return;
    applyTheme(readPreference());
    onChange();
  };

  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  window.addEventListener("storage", updateFromStorage);
  systemPreference.addEventListener("change", updateFromSystem);

  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, onChange);
    window.removeEventListener("storage", updateFromStorage);
    systemPreference.removeEventListener("change", updateFromSystem);
  };
}

export function AtlassianThemeProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const colorMode = useSyncExternalStore(subscribeToColorMode, getColorModeSnapshot, getServerColorModeSnapshot);

  useEffect(() => {
    applyTheme(readPreference());
  }, []);

  const toggleColorMode = useCallback(() => {
    const nextMode = getNextColorMode(colorMode);
    try {
      window.localStorage.setItem(STORAGE_KEY, nextMode);
    } catch {
      // Keep the current session usable when storage is unavailable.
    }
    applyTheme(nextMode);
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }, [colorMode]);

  const value = useMemo(() => ({ colorMode, toggleColorMode }), [colorMode, toggleColorMode]);

  return <AtlassianThemeContext.Provider value={value}>{children}</AtlassianThemeContext.Provider>;
}


export function useAtlassianTheme(): AtlassianThemeContextValue {
  const context = useContext(AtlassianThemeContext);
  if (!context) throw new Error("useAtlassianTheme must be used within AtlassianThemeProvider");
  return context;
}
