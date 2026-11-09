import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getWorkStorageKey, setHideMockData } from "@/shared/design-system/debug-settings";
import { ACTION_ITEMS_STORAGE_KEY, CREATED_WORK_ITEMS_STORAGE_KEY, WORK_ITEMS, readStoredActionItems, readStoredWorkItems } from "./work-item-store";

describe("empty retro debug workspace", () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
      },
      dispatchEvent: vi.fn(),
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("starts both tables empty when mock data is hidden", () => {
    expect(readStoredWorkItems().items.length).toBeGreaterThan(0);
    expect(readStoredActionItems().length).toBeGreaterThan(0);
    setHideMockData(true);
    expect(readStoredWorkItems().items).toEqual([]);
    expect(readStoredActionItems()).toEqual([]);
  });

  it("keeps normal saved data separate from debug data", () => {
    window.localStorage.setItem(ACTION_ITEMS_STORAGE_KEY, "[]");
    setHideMockData(true);
    window.localStorage.setItem(getWorkStorageKey(ACTION_ITEMS_STORAGE_KEY), JSON.stringify([{ id: "debug" }]));
    setHideMockData(false);
    expect(readStoredActionItems()).toEqual([]);
    setHideMockData(true);
    expect(readStoredActionItems()).toEqual([{ id: "debug" }]);
  });

  it("retains debug-created items even when their keys overlap fixtures", () => {
    setHideMockData(true);
    const item = { ...WORK_ITEMS[0], title: "Created in empty workspace" };
    window.localStorage.setItem(getWorkStorageKey(CREATED_WORK_ITEMS_STORAGE_KEY), JSON.stringify([item]));
    expect(readStoredWorkItems().items.map(({ title }) => title)).toEqual([item.title]);
  });
});
