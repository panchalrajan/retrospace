import { getWorkStorageKey, getHideMockData } from "@/shared/design-system/debug-settings";
import mockWorkItems from "./mock-work-items.json";
import mockActionItems from "./mock-action-items.json";
import type { ActionItem } from "./action-items-table";
import type { WorkComment } from "./work-item-components";

export type RetroStatus = (typeof mockWorkItems)[number]["status"];
export const RETRO_STATUSES: RetroStatus[] = [
  ...new Set(mockWorkItems.map((item) => item.status)),
];
export const STATUS_ORDER_STORAGE_KEY = "retrospace.status-order.v1";
export const WORK_ITEM_STATUS_STORAGE_KEY = "retrospace.work-item-statuses.v1";
export const WORK_ITEM_VOTES_STORAGE_KEY = "retrospace.work-item-votes.v1";
export const WORK_ITEM_TITLES_STORAGE_KEY = "retrospace.work-item-titles.v2";
export const WORK_ITEM_DETAILS_STORAGE_KEY = "retrospace.work-item-details.v1";
export const CREATED_WORK_ITEMS_STORAGE_KEY = "retrospace.created-work-items.v1";
export const DELETED_WORK_ITEMS_STORAGE_KEY = "retrospace.deleted-work-items.v1";
export const WORK_VIEW_STATE_STORAGE_KEY = "retrospace.work-view-state.v1";
export const ACTION_ITEMS_STORAGE_KEY = "retrospace.action-items.v2";
const LEGACY_ACTION_ITEMS_STORAGE_KEY = "retrospace.action-items.v1";
export type WorkItem = {
  key: string;
  title: string;
  description?: string;
  comments?: WorkComment[];
  createdBy: string;
  status: RetroStatus;
  votes: string[];
};

export const WORK_ITEMS: WorkItem[] = mockWorkItems;

function readStoredValue<T>(key: string, fallback: T): T {
  try {
    const stored = window.localStorage.getItem(getWorkStorageKey(key));
    return stored ? (JSON.parse(stored) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function readStoredWorkItems() {
  const statusOverrides = readStoredValue<Record<string, unknown>>(
    WORK_ITEM_STATUS_STORAGE_KEY,
    {},
  );
  const voteOverrides = readStoredValue<Record<string, unknown>>(
    WORK_ITEM_VOTES_STORAGE_KEY,
    {},
  );
  const titleOverrides = readStoredValue<Record<string, unknown>>(
    WORK_ITEM_TITLES_STORAGE_KEY,
    {},
  );
  const detailOverrides = readStoredValue<Record<string, unknown>>(
    WORK_ITEM_DETAILS_STORAGE_KEY,
    {},
  );
  const createdItems = readStoredValue<WorkItem[]>(
    CREATED_WORK_ITEMS_STORAGE_KEY,
    [],
  );
  const deletedKeys = new Set(
    readStoredValue<unknown[]>(DELETED_WORK_ITEMS_STORAGE_KEY, []).filter(
      (key): key is string => typeof key === "string",
    ),
  );
  const fixtureItems = [
    ...(getHideMockData() ? [] : WORK_ITEMS),
    ...createdItems.filter(
      (created) => getHideMockData() || !WORK_ITEMS.some((item) => item.key === created.key),
    ),
  ].filter((item) => !deletedKeys.has(item.key));

  const items = fixtureItems.map((item) => {
    const details = detailOverrides[item.key] as
      | { description?: unknown; comments?: unknown }
      | undefined;
    const status = statusOverrides[item.key];
    const votes = voteOverrides[item.key];
    return {
      ...item,
      status:
        typeof status === "string" && RETRO_STATUSES.includes(status as RetroStatus)
          ? (status as RetroStatus)
          : item.status,
      votes: Array.isArray(votes)
        ? votes.filter((voter): voter is string => typeof voter === "string")
        : item.votes,
      title:
        typeof titleOverrides[item.key] === "string"
          ? (titleOverrides[item.key] as string)
          : item.title,
      description:
        typeof details?.description === "string"
          ? details.description
          : (item.description ?? ""),
      comments: Array.isArray(details?.comments)
        ? (details.comments as WorkComment[])
        : (item.comments ?? []),
    };
  });

  return { items, deletedKeys };
}

export function readStoredActionItems(): ActionItem[] {
  const storedItems = readStoredValue<ActionItem[] | null>(
    ACTION_ITEMS_STORAGE_KEY,
    null,
  );
  if (storedItems) return storedItems;
  if (getHideMockData()) return [];

  const legacyItems = readStoredValue<ActionItem[] | null>(
    LEGACY_ACTION_ITEMS_STORAGE_KEY,
    null,
  );
  if (!legacyItems) return mockActionItems;

  const currentFixtures = new Map(mockActionItems.map((item) => [item.id, item]));
  return legacyItems.map((item) => {
    const fixture = currentFixtures.get(item.id);
    return fixture ? { ...item, dueDate: fixture.dueDate } : item;
  });
}

