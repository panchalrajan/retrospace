import type { AppProps } from "next/app";
import "@atlaskit/css-reset";
import "@/styles/globals.css";
import { AtlassianThemeProvider } from "@/shared/design-system/atlassian-theme-provider";
import { FlagsProvider } from "@atlaskit/flag/flags-provider";

export default function RetrospaceApp({ Component, pageProps }: AppProps) {
  return (
    <AtlassianThemeProvider>
      <FlagsProvider>
        <Component {...pageProps} />
      </FlagsProvider>
    </AtlassianThemeProvider>
  );
}
