import { useState } from "react";
import { useAccount } from "@/features/auth/session";
import { createClient } from "@/utils/supabase/client";
import { EndItem } from "@atlaskit/navigation-system/top-nav-items";
import SettingsIcon from "@atlaskit/icon/core/settings";
import { UserAvatar } from "@/shared/user-avatar";
import DropdownMenu, { DropdownItem, DropdownItemGroup, DropdownItemCheckbox, DropdownItemCheckboxGroup } from "@atlaskit/dropdown-menu";
import { useHideMockData, setHideMockData } from "@/shared/design-system/debug-settings";
import { useV2View, setV2View, useHideActionItems, setHideActionItems } from "@/shared/design-system/view-preferences";

export function SettingsAction() {
  const hideMockData = useHideMockData();
  const v2View = useV2View();
  const hideActionItems = useHideActionItems();
  return (
    <DropdownMenu
      label="Settings"
      menuLabel="Settings"
      placement="bottom-end"
      spacing="compact"
      trigger={({ triggerRef, ...triggerProps }) => (
        <EndItem {...triggerProps} ref={triggerRef} icon={SettingsIcon} label="Settings" />
      )}
    >
      <DropdownItemCheckboxGroup id="view-settings" title="View">
        <DropdownItemCheckbox id="v2-card-view" isSelected={v2View} onClick={() => setV2View(!v2View)}>
          V2 card view
        </DropdownItemCheckbox>
        <DropdownItemCheckbox id="hide-action-items" isSelected={hideActionItems} onClick={() => setHideActionItems(!hideActionItems)}>
          Hide action items
        </DropdownItemCheckbox>
      </DropdownItemCheckboxGroup>
      <DropdownItemCheckboxGroup id="debug-settings" title="Debug">
        <DropdownItemCheckbox
          id="hide-mock-data"
          isSelected={hideMockData}
          onClick={() => setHideMockData(!hideMockData)}
          description="Use a separate workspace without sample items"
          shouldDescriptionWrap
        >
          Hide mock data
        </DropdownItemCheckbox>
      </DropdownItemCheckboxGroup>
    </DropdownMenu>
  );
}

export function ProfileAction() {
  const account = useAccount();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const name = account?.name ?? "Your account";
  async function logout() {
    setBusy(true); setError("");
    try {
      const { error } = await createClient().auth.signOut();
      if (error) throw error;
      // Full navigation clears in-memory demo state after signing out.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/");
    } catch { setError("Unable to log out. Please try again."); setBusy(false); }
  }
  return <DropdownMenu label="Your account" menuLabel="Your account" placement="bottom-end" trigger={({ triggerRef, ...triggerProps }) => <EndItem {...triggerProps} ref={triggerRef} icon={() => <UserAvatar name={name} />} label="Your account" />}>
    <DropdownItemGroup title={name}>
      <DropdownItem isDisabled>{account?.isGuest ? "Guest session" : account?.email}</DropdownItem>
      <DropdownItem onClick={logout} isDisabled={busy}>{busy ? "Logging out…" : "Log out"}</DropdownItem>
    </DropdownItemGroup>
    {error && <p role="alert" className="auth-feedback auth-feedback--error">{error}</p>}
  </DropdownMenu>;
}
