import Head from "next/head";
import { useState } from "react";
import { useHideMockData } from "@/shared/design-system/debug-settings";
import { RetroWorkView } from "@/features/work/retro-work-view";
import { RetrospaceNavigation } from "@/features/navigation/retrospace-navigation";

export default function HomePage() {
  const [boardReady, setBoardReady] = useState(false);
  const hideMockData = useHideMockData();
  return (
    <>
      <Head>
        <title>Retrospace</title>
        <meta name="description" content="Retrospace workspace" />
      </Head>
      <div id="retrospace-root">
        <RetrospaceNavigation isLoading={!boardReady}>
          <RetroWorkView key={String(hideMockData)} onReadyChange={setBoardReady} />
        </RetrospaceNavigation>
      </div>
    </>
  );
}
