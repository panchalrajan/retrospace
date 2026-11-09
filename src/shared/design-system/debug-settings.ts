import { useSyncExternalStore } from "react";

const KEY = "retrospace.debug.hide-mock-data";
const CHANGE_EVENT = "retrospace-debug-settings-change";

export function getHideMockData(): boolean {
  try { return window.localStorage.getItem(KEY) === "true"; }
  catch { return false; }
}

export function setHideMockData(enabled: boolean) {
  window.localStorage.setItem(KEY, String(enabled));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY || event.key === null) onChange();
  };
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function useHideMockData() {
  return useSyncExternalStore(subscribe, getHideMockData, () => false);
}

let accountStorageId: string | null = null;
export function setWorkStorageAccount(id: string | null) { accountStorageId = id; }
export function scopeWorkStorageKey(key: string, id: string | null, empty: boolean) {
  const scoped = empty ? `debug-empty:${key}` : key;
  return id ? `account:${id}:${scoped}` : scoped;
}
export function getWorkStorageKey(key: string) {
  return scopeWorkStorageKey(key, accountStorageId, getHideMockData());
}
