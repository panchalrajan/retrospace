import { EndItem } from "@atlaskit/navigation-system/top-nav-items";
import SettingsIcon from "@atlaskit/icon/core/settings";
import { UserAvatar } from "@/shared/user-avatar";
import DropdownMenu, { DropdownItemCheckbox, DropdownItemCheckboxGroup } from "@atlaskit/dropdown-menu";
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
  return <EndItem icon={ProfileAvatarIcon} label="Profile" />;
}

function ProfileAvatarIcon() {
  return <UserAvatar name="Rajan Panchal" />;
}
