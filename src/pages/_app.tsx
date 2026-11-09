import type { AppProps } from "next/app";
import "@atlaskit/css-reset";
import "@/styles/globals.css";
import { AtlassianThemeProvider } from "@/shared/design-system/atlassian-theme-provider";
import { DesktopGate } from "@/shared/design-system/desktop-gate";
import { FlagsProvider } from "@atlaskit/flag/flags-provider";

export default function RetrospaceApp({ Component, pageProps }: AppProps) {
  return (
    <AtlassianThemeProvider>
      <FlagsProvider>
        <DesktopGate><Component {...pageProps} /></DesktopGate>
      </FlagsProvider>
    </AtlassianThemeProvider>
  );
}
