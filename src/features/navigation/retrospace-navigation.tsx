"use client";

import { Main } from "@atlaskit/navigation-system/layout/main";
import { useState } from "react";
import { Root } from "@atlaskit/navigation-system/layout/root";
import { TopNav, TopNavEnd, TopNavMiddle, TopNavStart } from "@atlaskit/navigation-system/layout/top-nav";
import { ProfileAction, SettingsAction } from "@/features/navigation/components/navigation-actions";
import { RetroParticipantGroup } from "@/features/navigation/components/retro-participant-group";
import { RetroTimer, RetroTimerDurationContext } from "@/features/work/retro-session-tools";
import { RetrospaceBrand } from "@/features/navigation/components/retrospace-brand";
import { ThemeToggle } from "@/features/navigation/components/theme-toggle";

export function RetrospaceNavigation({ children, isLoading = false }: Readonly<{ children: React.ReactNode; isLoading?: boolean }>) {
  const timerDurationContext = useState(15);
  return (
    <RetroTimerDurationContext.Provider value={timerDurationContext}>
    <Root>
      {!isLoading && <TopNav>
        <TopNavStart sideNavToggleButton={null} testId="retrospace-nav-start">
          <RetrospaceBrand />
        </TopNavStart>
        <TopNavMiddle>{null}</TopNavMiddle>
        <TopNavEnd label="Account controls">
          <RetroTimer />
          <RetroParticipantGroup />
          <ThemeToggle />
          <SettingsAction />
          <ProfileAction />
        </TopNavEnd>
      </TopNav>}
      <Main>
        {children}
      </Main>
    </Root>
    </RetroTimerDurationContext.Provider>
  );
}
