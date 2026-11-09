"use client";

import { EndItem } from "@atlaskit/navigation-system/top-nav-items";
import ThemeIcon from "@atlaskit/icon/core/theme";
import { useAtlassianTheme } from "@/shared/design-system/atlassian-theme-provider";

export function ThemeToggle() {
  const { colorMode, toggleColorMode } = useAtlassianTheme();
  const label = colorMode === "dark" ? "Switch to light theme" : "Switch to dark theme";

  return <EndItem icon={ThemeIcon} label={label} onClick={toggleColorMode} />;
}
