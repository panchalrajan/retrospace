import { useSyncExternalStore } from "react";

const KEY = "retrospace.view.v2";
const HIDE_ACTIONS_KEY = "retrospace.view.hide-actions";
const EVENT = "retrospace-view-change";
function read() {
  try { return window.localStorage.getItem(KEY) === "true"; }
  catch { return false; }
}
function readHideActions() {
  try { return window.localStorage.getItem(HIDE_ACTIONS_KEY) === "true"; }
  catch { return false; }
}
export function setHideActionItems(enabled: boolean) {
  window.localStorage.setItem(HIDE_ACTIONS_KEY, String(enabled));
  window.dispatchEvent(new Event(EVENT));
}
export function useHideActionItems() {
  return useSyncExternalStore(subscribe, readHideActions, () => false);
}
export function setV2View(enabled: boolean) {
  window.localStorage.setItem(KEY, String(enabled));
  window.dispatchEvent(new Event(EVENT));
}
function subscribe(listener: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY || event.key === HIDE_ACTIONS_KEY || event.key === null) listener();
  };
  window.addEventListener(EVENT, listener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, listener);
    window.removeEventListener("storage", onStorage);
  };
}
export function useV2View() {
  return useSyncExternalStore(subscribe, read, () => false);
}
