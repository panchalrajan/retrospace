"use client";
import { getWorkStorageKey, getHideMockData } from "@/shared/design-system/debug-settings";

import { ActionItemsTable, type ActionItem } from "./action-items-table";
import {
  CURRENT_USER_NAME,
  RETRO_BOARD_CREATOR_NAME,
} from "./work-item-constants";
import {
  WorkTable,
  WorkRefreshButton,
  VoteControl,
  CommentsControl,
  CommentsSection,
  ItemFields,
  ItemModal,
  StatusDropdown,
  type WorkComment,
} from "./work-item-components";

import {
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactChild, RefObject } from "react";
import Button from "@atlaskit/button/button";
import InlineEdit from "@atlaskit/inline-edit";
import { useV2View, useHideActionItems } from "@/shared/design-system/view-preferences";
import { WorkBoard, WorkBoardColumn, WorkItemCard } from "./work-board";
import { canViewActionItems } from "./work-permissions";
import { matchesWorkSearch } from "./work-search";
import ButtonGroup from "@atlaskit/button/button-group";
import { ReorderableTable } from "@/shared/design-system/reorderable-table";
import EmptyState from "@atlaskit/empty-state";
import { Checkbox } from "@atlaskit/checkbox";
import { useFlags } from "@atlaskit/flag/use-flags";
import CheckCircleIcon from "@atlaskit/icon/core/check-circle";
import ErrorIcon from "@atlaskit/icon/core/error";
import DropdownMenu, {
  DropdownItem,
  DropdownItemGroup,
} from "@atlaskit/dropdown-menu";
import ChevronDownIcon from "@atlaskit/icon/core/chevron-down";
import AddIcon from "@atlaskit/icon/core/add";
import CrossIcon from "@atlaskit/icon/core/cross";
import DownloadIcon from "@atlaskit/icon/core/download";
import DeleteIcon from "@atlaskit/icon/core/delete";
import EditIcon from "@atlaskit/icon/core/edit";
import SearchIcon from "@atlaskit/icon/core/search";
import PersonAddIcon from "@atlaskit/icon/core/person-add";
import ShareIcon from "@atlaskit/icon/core/share";
import Lozenge, { type ThemeAppearance } from "@atlaskit/lozenge";
import ModalDialog, { ModalTitle } from "@atlaskit/modal-dialog";
import Textfield from "@atlaskit/textfield";
import { UserAvatar } from "@/shared/user-avatar";
import {
  RetroModalActions,
  RetroModalBody,
  RetroModalFooter,
  RetroModalHeader,
} from "@/shared/design-system/retro-modal-parts";
import {
  RetroSessionTools,
  RetroTimerDurationContext,
} from "./retro-session-tools";
import mockActionItems from "./mock-action-items.json";
import {
  type RetroStatus, type WorkItem, RETRO_STATUSES, WORK_ITEMS,
  STATUS_ORDER_STORAGE_KEY, WORK_ITEM_STATUS_STORAGE_KEY,
  WORK_ITEM_VOTES_STORAGE_KEY, WORK_ITEM_TITLES_STORAGE_KEY,
  WORK_ITEM_DETAILS_STORAGE_KEY, CREATED_WORK_ITEMS_STORAGE_KEY,
  DELETED_WORK_ITEMS_STORAGE_KEY, WORK_VIEW_STATE_STORAGE_KEY,
  ACTION_ITEMS_STORAGE_KEY, readStoredWorkItems, readStoredActionItems,
} from "./work-item-store";


const DEFAULT_STATUS_NAMES = [
  "Kudos",
  "Liked",
  "Learned",
  "Lacked",
  "Longed For",
  "Start",
  "Stop",
  "Continue",
] as const;
const DEFAULT_STATUS_ORDER: RetroStatus[] = [
  ...DEFAULT_STATUS_NAMES.filter((status) => RETRO_STATUSES.includes(status)),
  ...RETRO_STATUSES.filter(
    (status) =>
      !DEFAULT_STATUS_NAMES.includes(
        status as (typeof DEFAULT_STATUS_NAMES)[number],
      ),
  ),
];
type ColumnId =
  | "number"
  | "key"
  | "title"
  | "createdBy"
  | "status"
  | "votes"
  | "comments"
  | "delete";
type FilterOperator = "equals" | "not-equals";
type FilterKind = "status" | "participant";
type FilterChoice = { value: string; label: string; content: ReactChild };
type DialogFocusTarget = "summary" | "comment";

const useHydrationLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

const PAGE_SIZE = 10;

const COLUMNS: ReadonlyArray<{ id: ColumnId; label: string; width: number }> = [
  { id: "number", label: "#", width: 3 },
  { id: "key", label: "Ticket ID", width: 10 },
  { id: "title", label: "Item", width: 45 },
  { id: "createdBy", label: "Created by", width: 12 },
  { id: "status", label: "Retro Event", width: 10 },
  { id: "votes", label: "Votes", width: 7 },
  { id: "comments", label: "Comments", width: 7 },
  { id: "delete", label: "Actions", width: 6 },
];

function statusAppearance(status: RetroStatus): ThemeAppearance {
  switch (status) {
    case "Kudos":
      return "success";
    case "Liked":
    case "Learned":
    case "Continue":
      return "inprogress";
    case "Lacked":
    case "Stop":
      return "removed";
    case "Longed For":
      return "moved";
    case "Start":
      return "new";
    default:
      return "default";
  }
}

function canEditWorkItem(item: WorkItem): boolean {
  return (
    CURRENT_USER_NAME === RETRO_BOARD_CREATOR_NAME ||
    item.createdBy === CURRENT_USER_NAME
  );
}

function sortValue(
  item: WorkItem,
  column: ColumnId,
  statusOrder: RetroStatus[],
): string | number {
  if (column === "number")
    return Number(item.key.slice(item.key.lastIndexOf("-") + 1));
  if (column === "delete") return "";
  if (column === "status") return statusOrder.indexOf(item.status);
  if (column === "votes") return item.votes.length;
  if (column === "comments") return item.comments?.length ?? 0;
  return item[column].toLocaleLowerCase();
}

function moveStatusRelative(
  order: RetroStatus[],
  moving: RetroStatus,
  target: RetroStatus,
  after: boolean,
): RetroStatus[] {
  if (moving === target) return order;
  const fromIndex = order.indexOf(moving);
  if (fromIndex < 0 || !order.includes(target)) return order;
  const next = [...order];
  next.splice(fromIndex, 1);
  const targetIndex = next.indexOf(target) + (after ? 1 : 0);
  next.splice(targetIndex, 0, moving);
  return next.every((status, index) => status === order[index]) ? order : next;
}

function moveStatusWithinVisibleOrder(
  order: RetroStatus[],
  visibleStatuses: RetroStatus[],
  moving: RetroStatus,
  target: RetroStatus,
  after: boolean,
): RetroStatus[] {
  const visibleOrder = order.filter((status) =>
    visibleStatuses.includes(status),
  );
  const reorderedVisible = moveStatusRelative(
    visibleOrder,
    moving,
    target,
    after,
  );
  if (reorderedVisible === visibleOrder) return order;
  let visibleIndex = 0;
  const visibleSet = new Set(visibleOrder);
  return order.map((status) =>
    visibleSet.has(status) ? reorderedVisible[visibleIndex++] : status,
  );
}

function normalizeStatusOrder(candidate: unknown): RetroStatus[] {
  const validCandidate = Array.isArray(candidate)
    ? candidate.filter(
        (status): status is RetroStatus =>
          typeof status === "string" && RETRO_STATUSES.includes(status),
      )
    : [];
  return [
    ...new Set(validCandidate),
    ...DEFAULT_STATUS_ORDER.filter(
      (status) => !validCandidate.includes(status),
    ),
  ];
}

function RetroMultiSelectFilter({
  id,
  fieldName,
  triggerLabel,
  multipleSelectionLabel,
  searchPlaceholder,
  searchLabel,
  options,
  selectedValues,
  operator,
  onOperatorChange,
  onToggle,
  searchValue,
  onSearchChange,
  open,
  onOpenChange,
  operatorOpen,
  onOperatorOpenChange,
  onClearSelection,
  triggerRef,
}: {
  id: string;
  fieldName: string;
  triggerLabel: string;
  multipleSelectionLabel: string;
  searchPlaceholder: string;
  searchLabel: string;
  options: FilterChoice[];
  selectedValues: Set<string>;
  operator: FilterOperator;
  onOperatorChange: (operator: FilterOperator) => void;
  onToggle: (value: string) => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operatorOpen: boolean;
  onOperatorOpenChange: (open: boolean) => void;
  onClearSelection: () => void;
  triggerRef: RefObject<HTMLButtonElement>;
}) {
  const visibleOptions = options.filter((option) =>
    option.label.toLowerCase().includes(searchValue.trim().toLowerCase()),
  );
  const triggerText =
    selectedValues.size === 0
      ? triggerLabel
      : selectedValues.size === 1
        ? (options.find((option) => selectedValues.has(option.value))?.label ??
          triggerLabel)
        : `${multipleSelectionLabel} (${selectedValues.size})`;
  const operatorLabel = `${fieldName} ${operator === "equals" ? "=" : "!="} (${operator === "equals" ? "equals" : "not equals"})`;

  return (
    <>
      <Button
        className="retro-event-filter-trigger"
        appearance={selectedValues.size > 0 ? "primary" : "default"}
        spacing="default"
        ref={triggerRef}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={`${id}-popover`}
        data-filter-active={selectedValues.size > 0}
        iconAfter={<ChevronDownIcon label="" />}
        onClick={() => onOpenChange(!open)}
      >
        {triggerText}
      </Button>

      {open && (
        <section
          className="retro-event-filter-popover"
          id={`${id}-popover`}
          role="dialog"
          aria-label={`Filter by ${fieldName.toLowerCase()}`}
        >
          <div className="retro-filter-summary">
            <DropdownMenu
              isOpen={operatorOpen}
              onOpenChange={({ isOpen }) => onOperatorOpenChange(isOpen)}
              label={`Choose ${fieldName.toLowerCase()} matching operator`}
              menuLabel={`${fieldName} matching operator`}
              placement="bottom-start"
              spacing="compact"
              trigger={({
                triggerRef: menuTriggerRef,
                onClick,
                ...triggerProps
              }) => (
                <Button
                  {...triggerProps}
                  ref={menuTriggerRef}
                  appearance="default"
                  spacing="default"
                  className="retro-operator-trigger"
                  iconAfter={<ChevronDownIcon label="" />}
                  onClick={onClick}
                >
                  {operatorLabel}
                </Button>
              )}
            >
              <DropdownItemGroup>
                {(
                  [
                    ["equals", `${fieldName} = (equals)`],
                    ["not-equals", `${fieldName} != (not equals)`],
                  ] as const
                ).map(([value, label]) => (
                  <DropdownItem
                    key={value}
                    isSelected={operator === value}
                    onClick={() => onOperatorChange(value)}
                  >
                    {label}
                  </DropdownItem>
                ))}
              </DropdownItemGroup>
            </DropdownMenu>
          </div>

          <div className="retro-status-search">
            <Textfield
              className="retro-status-search-field"
              isCompact
              type="search"
              value={searchValue}
              onChange={(event) =>
                onSearchChange((event.target as HTMLInputElement).value)
              }
              placeholder={searchPlaceholder}
              aria-label={searchLabel}
              elemBeforeInput={<SearchIcon label="" />}
            />
          </div>

          <div
            className="retro-status-options"
            role="group"
            aria-label={fieldName}
          >
            {visibleOptions.length > 0 ? (
              visibleOptions.map((option) => (
                <div className="retro-status-option" key={option.value}>
                  <Checkbox
                    name={id}
                    value={option.value}
                    isChecked={selectedValues.has(option.value)}
                    label={option.content}
                    onChange={() => onToggle(option.value)}
                  />
                </div>
              ))
            ) : (
              <div className="retro-status-empty">No matches found</div>
            )}
          </div>

          <footer className="retro-status-filter-footer">
            <Button
              appearance="subtle"
              spacing="compact"
              onClick={onClearSelection}
            >
              Clear selection
            </Button>
            <span>
              {visibleOptions.length} of {options.length}
            </span>
          </footer>
        </section>
      )}
    </>
  );
}

export function RetroWorkView({ onReadyChange }: { onReadyChange?: (ready: boolean) => void }) {
  const { showFlag } = useFlags();
  const v2View = useV2View();
  const hideActionItems = useHideActionItems();
  const mayViewActionItems = canViewActionItems(CURRENT_USER_NAME, RETRO_BOARD_CREATOR_NAME);
  const showActionItems = mayViewActionItems && !hideActionItems;
  const statusFilterRef = useRef<HTMLDivElement>(null);
  const participantFilterRef = useRef<HTMLDivElement>(null);
  const statusOrderRef = useRef<HTMLDivElement>(null);
  const statusFilterTriggerRef = useRef<HTMLButtonElement>(null);
  const participantFilterTriggerRef = useRef<HTMLButtonElement>(null);
  const summaryTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const commentInputRef = useRef<HTMLTextAreaElement | null>(null);
  const createButtonRef = useRef<HTMLButtonElement | null>(null);
  const deleteActionRefs = useRef(new Map<string, HTMLElement>());
  const focusAfterDeleteRef = useRef<string | null>(null);
  const restoreFocusAfterDeleteRef = useRef(false);
  const [query, setQuery] = useState("");
  const [boardTitle, setBoardTitle] = useState("All work");
  const [statusQuery, setStatusQuery] = useState("");
  const [participantQuery, setParticipantQuery] = useState("");
  const [workItems, setWorkItems] = useState<WorkItem[]>(WORK_ITEMS);
  const [deletedWorkItemKeys, setDeletedWorkItemKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const [workItemStatusesReady, setWorkItemStatusesReady] = useState(false);
  const [viewStateReady, setViewStateReady] = useState(false);
  const [startupDelayElapsed, setStartupDelayElapsed] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setStartupDelayElapsed(true), 1500);
    return () => window.clearTimeout(timer);
  }, []);
  const [page, setPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<ColumnId>("status");
  const [sortDirection, setSortDirection] = useState<
    "ascending" | "descending"
  >("ascending");
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [actionItems, setActionItems] = useState<ActionItem[]>(mockActionItems);
  const [actionItemsReady, setActionItemsReady] = useState(false);
  const [actionItemDialogOpen, setActionItemDialogOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [timerDuration] = useContext(RetroTimerDurationContext);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [pendingDeleteKey, setPendingDeleteKey] = useState<string | null>(null);
  const [dialogItemKey, setDialogItemKey] = useState<string | null>(null);
  const [dialogFocusTarget, setDialogFocusTarget] =
    useState<DialogFocusTarget>("summary");
  const [summaryDraft, setSummaryDraft] = useState("");
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [categoryDraft, setCategoryDraft] = useState<RetroStatus>(
    DEFAULT_STATUS_ORDER[0],
  );
  const [commentDraft, setCommentDraft] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(
    () => new Set(),
  );
  const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(
    () => new Set(),
  );
  const [statusFilterOperator, setStatusFilterOperator] =
    useState<FilterOperator>("equals");
  const [participantFilterOperator, setParticipantFilterOperator] =
    useState<FilterOperator>("equals");
  const [openFilter, setOpenFilter] = useState<FilterKind | null>(null);
  const [openOperator, setOpenOperator] = useState<FilterKind | null>(null);
  const [statusOrderOpen, setStatusOrderOpen] = useState(false);
  const [statusOrder, setStatusOrder] =
    useState<RetroStatus[]>(DEFAULT_STATUS_ORDER);
  const [statusOrderReady, setStatusOrderReady] = useState(false);
  const refreshWorkTables = useCallback(() => {
    const { items, deletedKeys } = readStoredWorkItems();
    setWorkItems(items);
    setDeletedWorkItemKeys(deletedKeys);
    setActionItems(readStoredActionItems());
    setPage(1);
  }, []);
  const orderableStatuses = useMemo(
    () =>
      statusOrder.filter(
        (status) =>
          selectedStatuses.size === 0 ||
          (statusFilterOperator === "equals"
            ? selectedStatuses.has(status)
            : !selectedStatuses.has(status)),
      ),
    [selectedStatuses, statusFilterOperator, statusOrder],
  );

  const dialogItem = dialogItemKey
    ? workItems.find((item) => item.key === dialogItemKey)
    : undefined;
  const pendingDeleteItem = pendingDeleteKey
    ? workItems.find((item) => item.key === pendingDeleteKey)
    : undefined;
  const canEditDialogItem =
    !dialogItemKey || (dialogItem ? canEditWorkItem(dialogItem) : false);

  useHydrationLayoutEffect(() => {
    setActionItems(readStoredActionItems());
    setActionItemsReady(true);
  }, []);
  useEffect(() => {
    if (!actionItemsReady) return;
    try {
      window.localStorage.setItem(
        getWorkStorageKey(ACTION_ITEMS_STORAGE_KEY),
        JSON.stringify(actionItems),
      );
    } catch {
      /* Keep edits in memory for this session. */
    }
  }, [actionItems, actionItemsReady]);

  useHydrationLayoutEffect(() => {
    try {
      const saved = window.localStorage.getItem(getWorkStorageKey(STATUS_ORDER_STORAGE_KEY));
      if (saved) setStatusOrder(normalizeStatusOrder(JSON.parse(saved)));
    } catch {
      // Keep the default order when browser storage is unavailable or invalid.
    }
    setStatusOrderReady(true);
  }, []);

  useEffect(() => {
    if (!statusOrderReady) return;
    try {
      window.localStorage.setItem(
        getWorkStorageKey(STATUS_ORDER_STORAGE_KEY),
        JSON.stringify(statusOrder),
      );
    } catch {
      // The in-memory order still works if browser storage is unavailable.
    }
  }, [statusOrder, statusOrderReady]);

  useHydrationLayoutEffect(() => {
    const { items, deletedKeys } = readStoredWorkItems();
    setDeletedWorkItemKeys(deletedKeys);
    setWorkItems(items);
    setWorkItemStatusesReady(true);
  }, []);

  useHydrationLayoutEffect(() => {
    try {
      const saved = window.localStorage.getItem(getWorkStorageKey(WORK_VIEW_STATE_STORAGE_KEY));
      if (saved) {
        const viewState = JSON.parse(saved) as Record<string, unknown>;
        if (typeof viewState.boardTitle === "string" && viewState.boardTitle.trim()) {
          setBoardTitle(viewState.boardTitle.trim().slice(0, 120));
        }
        if (typeof viewState.query === "string") setQuery(viewState.query);
        if (Array.isArray(viewState.selectedStatuses)) {
          setSelectedStatuses(
            new Set(
              viewState.selectedStatuses.filter(
                (value): value is string =>
                  typeof value === "string" && RETRO_STATUSES.includes(value),
              ),
            ),
          );
        }
        if (Array.isArray(viewState.selectedParticipants)) {
          setSelectedParticipants(
            new Set(
              viewState.selectedParticipants.filter(
                (value): value is string => typeof value === "string",
              ),
            ),
          );
        }
        if (
          viewState.statusFilterOperator === "equals" ||
          viewState.statusFilterOperator === "not-equals"
        )
          setStatusFilterOperator(viewState.statusFilterOperator);
        if (
          viewState.participantFilterOperator === "equals" ||
          viewState.participantFilterOperator === "not-equals"
        )
          setParticipantFilterOperator(viewState.participantFilterOperator);
        if (
          typeof viewState.page === "number" &&
          Number.isInteger(viewState.page) &&
          viewState.page > 0
        )
          setPage(viewState.page);
        if (
          typeof viewState.sortColumn === "string" &&
          COLUMNS.some(({ id }) => id === viewState.sortColumn)
        )
          setSortColumn(viewState.sortColumn as ColumnId);
        if (
          viewState.sortDirection === "ascending" ||
          viewState.sortDirection === "descending"
        )
          setSortDirection(viewState.sortDirection);
      }
    } catch {
      // Keep the default board view when browser storage is unavailable or invalid.
    }
    setViewStateReady(true);
  }, []);

  useEffect(() => {
    if (!workItemStatusesReady) return;
    try {
      window.localStorage.setItem(
        getWorkStorageKey(WORK_ITEM_STATUS_STORAGE_KEY),
        JSON.stringify(
          Object.fromEntries(workItems.map(({ key, status }) => [key, status])),
        ),
      );
      window.localStorage.setItem(
        getWorkStorageKey(WORK_ITEM_VOTES_STORAGE_KEY),
        JSON.stringify(
          Object.fromEntries(workItems.map(({ key, votes }) => [key, votes])),
        ),
      );
      window.localStorage.setItem(
        getWorkStorageKey(WORK_ITEM_TITLES_STORAGE_KEY),
        JSON.stringify(
          Object.fromEntries(workItems.map(({ key, title }) => [key, title])),
        ),
      );
      window.localStorage.setItem(
        getWorkStorageKey(WORK_ITEM_DETAILS_STORAGE_KEY),
        JSON.stringify(
          Object.fromEntries(
            workItems.map(({ key, description, comments }) => [
              key,
              { description: description ?? "", comments: comments ?? [] },
            ]),
          ),
        ),
      );
      window.localStorage.setItem(
        getWorkStorageKey(CREATED_WORK_ITEMS_STORAGE_KEY),
        JSON.stringify(
          workItems.filter(
            ({ key }) => getHideMockData() || !WORK_ITEMS.some((item) => item.key === key),
          ),
        ),
      );
    } catch {
      // Status and vote edits still work in memory if browser storage is unavailable.
    }
  }, [workItems, workItemStatusesReady]);

  useEffect(() => {
    if (!workItemStatusesReady) return;
    try {
      window.localStorage.setItem(
        getWorkStorageKey(DELETED_WORK_ITEMS_STORAGE_KEY),
        JSON.stringify([...deletedWorkItemKeys]),
      );
    } catch {
      // Deleted rows remain hidden for this session if storage is unavailable.
    }
  }, [deletedWorkItemKeys, workItemStatusesReady]);

  useEffect(() => {
    if (!viewStateReady) return;
    try {
      window.localStorage.setItem(
        getWorkStorageKey(WORK_VIEW_STATE_STORAGE_KEY),
        JSON.stringify({
          boardTitle,
          query,
          selectedStatuses: [...selectedStatuses],
          selectedParticipants: [...selectedParticipants],
          statusFilterOperator,
          participantFilterOperator,
          page,
          sortColumn,
          sortDirection,
        }),
      );
    } catch {
      // The board remains usable for this session when browser storage is unavailable.
    }
  }, [
    boardTitle,
    page,
    participantFilterOperator,
    query,
    selectedParticipants,
    selectedStatuses,
    sortColumn,
    sortDirection,
    statusFilterOperator,
    viewStateReady,
  ]);

  const moveStatusInView = useCallback(
    (moving: RetroStatus, target: RetroStatus, after: boolean) => {
      setStatusOrder((order) =>
        moveStatusWithinVisibleOrder(
          order,
          orderableStatuses,
          moving,
          target,
          after,
        ),
      );
      setSortColumn("status");
      setSortDirection("ascending");
      setPage(1);
    },
    [orderableStatuses],
  );
  const resetPage = useCallback(() => setPage(1), []);

  useEffect(() => {
    function closeOnOutsidePointer(event: PointerEvent) {
      const target = event.target as Element;
      const pointerIsInsidePortaledOperatorMenu =
        openOperator !== null && Boolean(target.closest('[role="menu"]'));
      const activeFilterRef =
        openFilter === "status"
          ? statusFilterRef
          : openFilter === "participant"
            ? participantFilterRef
            : null;
      if (
        activeFilterRef &&
        !activeFilterRef.current?.contains(target) &&
        !pointerIsInsidePortaledOperatorMenu
      ) {
        setOpenFilter(null);
        setOpenOperator(null);
      }
      if (
        statusOrderRef.current &&
        !statusOrderRef.current.contains(event.target as Node)
      ) {
        setStatusOrderOpen(false);
      }
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (itemDialogOpen) {
        closeItemDialog();
        return;
      }
      if (openOperator) {
        setOpenOperator(null);
        return;
      }
      if (openFilter) {
        setOpenFilter(null);
        (openFilter === "status"
          ? statusFilterTriggerRef
          : participantFilterTriggerRef
        ).current?.focus();
        return;
      }
      setStatusOrderOpen(false);
    }
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [openFilter, openOperator, itemDialogOpen]);

  const filteredItems = useMemo(() => {
    return workItems
      .filter((item) => {
        const matchesText = matchesWorkSearch(query, [item.key, item.title, item.description, item.createdBy, item.status]);
        const matchesStatus =
          selectedStatuses.size === 0 ||
          (statusFilterOperator === "equals"
            ? selectedStatuses.has(item.status)
            : !selectedStatuses.has(item.status));
        const matchesParticipant =
          selectedParticipants.size === 0 ||
          (participantFilterOperator === "equals"
            ? selectedParticipants.has(item.createdBy)
            : !selectedParticipants.has(item.createdBy));
        return matchesText && matchesStatus && matchesParticipant;
      })
      .sort((left, right) => {
        const a = sortValue(left, sortColumn, statusOrder);
        const b = sortValue(right, sortColumn, statusOrder);
        const comparison =
          typeof a === "number" && typeof b === "number"
            ? a - b
            : String(a).localeCompare(String(b));
        return sortDirection === "ascending" ? comparison : -comparison;
      });
  }, [
    participantFilterOperator,
    query,
    selectedParticipants,
    selectedStatuses,
    sortColumn,
    sortDirection,
    statusFilterOperator,
    statusOrder,
    workItems,
  ]);

  const pageCount = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * PAGE_SIZE;
  const visibleItems = filteredItems.slice(start, start + PAGE_SIZE);
  const participants = useMemo(
    () =>
      [...new Set(workItems.map((item) => item.createdBy))].sort(
        (left, right) => left.localeCompare(right),
      ),
    [workItems],
  );
  const statusChoices: FilterChoice[] = statusOrder.map((status) => ({
    value: status,
    label: status,
    content: <Lozenge appearance={statusAppearance(status)}>{status}</Lozenge>,
  }));
  const participantChoices: FilterChoice[] = participants.map((name) => ({
    value: name,
    label: name,
    content: (
      <span className="vote-person">
        <UserAvatar name={name} />
        {name}
      </span>
    ),
  }));
  const hasActiveFilters =
    query.trim().length > 0 ||
    selectedStatuses.size > 0 ||
    selectedParticipants.size > 0;

  function toggleStatus(status: string) {
    setSelectedStatuses((current) => {
      const next = new Set(current);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
    resetPage();
  }

  function toggleParticipant(name: string) {
    setSelectedParticipants((current) => {
      const next = new Set(current);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
    resetPage();
  }

  function toggleUpvote(itemKey: string) {
    setWorkItems((items) =>
      items.map((item) => {
        if (item.key !== itemKey) return item;
        const hasVoted = item.votes.includes(CURRENT_USER_NAME);
        return {
          ...item,
          votes: hasVoted
            ? item.votes.filter((voter) => voter !== CURRENT_USER_NAME)
            : [...item.votes, CURRENT_USER_NAME],
        };
      }),
    );
  }

  function openItemDialog(
    item?: WorkItem,
    focusTarget: DialogFocusTarget = "summary",
  ) {
    setDialogItemKey(item?.key ?? null);
    setDialogFocusTarget(focusTarget);
    setSummaryDraft(item?.title ?? "");
    setDescriptionDraft(item?.description ?? "");
    setCategoryDraft(
      item?.status ??
        orderableStatuses[0] ??
        statusOrder[0] ??
        DEFAULT_STATUS_ORDER[0],
    );
    setCommentDraft("");
    setItemDialogOpen(true);
  }

  function closeItemDialog() {
    setItemDialogOpen(false);
    setDialogItemKey(null);
    setCommentDraft("");
    setEditingCommentId(null);
  }

  function confirmDeleteWorkItem() {
    if (!pendingDeleteItem || !canEditWorkItem(pendingDeleteItem)) return;
    const rowIndex = visibleItems.findIndex(
      (item) => item.key === pendingDeleteItem.key,
    );
    const nextFocusItem =
      visibleItems[rowIndex + 1] ?? visibleItems[rowIndex - 1];
    focusAfterDeleteRef.current = nextFocusItem?.key ?? null;
    restoreFocusAfterDeleteRef.current = true;
    setWorkItems((items) =>
      items.filter((item) => item.key !== pendingDeleteItem.key),
    );
    setDeletedWorkItemKeys((keys) => new Set(keys).add(pendingDeleteItem.key));
    setPendingDeleteKey(null);
  }

  function focusDialogInput() {
    if (dialogFocusTarget === "comment" && dialogItemKey) {
      commentInputRef.current?.focus();
      return;
    }
    const summary = summaryTextareaRef.current;
    if (!summary) return;
    summary.focus();
    const end = summary.value.length;
    summary.setSelectionRange(end, end);
  }

  function saveItemDialog() {
    const title = summaryDraft.trim();
    if (!title) return;
    if (dialogItemKey) {
      const item = workItems.find(
        (candidate) => candidate.key === dialogItemKey,
      );
      if (!item || !canEditWorkItem(item)) return;
      setWorkItems((items) =>
        items.map((item) =>
          item.key === dialogItemKey
            ? {
                ...item,
                title,
                description: descriptionDraft.trim(),
                status: categoryDraft,
              }
            : item,
        ),
      );
    } else {
      const nextNumber =
        Math.max(
          0,
          ...workItems.map(
            (item) =>
              Number(item.key.slice(item.key.lastIndexOf("-") + 1)) || 0,
          ),
        ) + 1;
      const newItem: WorkItem = {
        key: `RETRO-${nextNumber}`,
        title,
        description: descriptionDraft.trim(),
        comments: [],
        createdBy: CURRENT_USER_NAME,
        status: categoryDraft,
        votes: [],
      };
      setWorkItems((items) => [newItem, ...items]);
      resetPage();
    }
    closeItemDialog();
  }

  function saveComment() {
    const text = commentDraft.trim();
    if (!text || !dialogItemKey) return;
    if (editingCommentId) {
      setWorkItems((items) =>
        items.map((item) =>
          item.key === dialogItemKey
            ? {
                ...item,
                comments: (item.comments ?? []).map((comment) =>
                  comment.id === editingCommentId
                    ? { ...comment, text }
                    : comment,
                ),
              }
            : item,
        ),
      );
      setEditingCommentId(null);
      setCommentDraft("");
      return;
    }
    const comment: WorkComment = {
      id: `${Date.now()}`,
      author: CURRENT_USER_NAME,
      text,
      createdAt: new Date().toISOString(),
      votes: [],
    };
    setWorkItems((items) =>
      items.map((item) =>
        item.key === dialogItemKey
          ? { ...item, comments: [...(item.comments ?? []), comment] }
          : item,
      ),
    );
    setCommentDraft("");
  }

  function startEditingComment(comment: WorkComment) {
    setEditingCommentId(comment.id);
    setCommentDraft(comment.text);

  }

  function cancelCommentEdit() {
    setEditingCommentId(null);
    setCommentDraft("");
  }

  function deleteComment(itemKey: string, commentId: string) {
    setWorkItems((items) =>
      items.map((item) =>
        item.key === itemKey
          ? {
              ...item,
              comments: (item.comments ?? []).filter(
                (comment) => comment.id !== commentId,
              ),
            }
          : item,
      ),
    );
    if (editingCommentId === commentId) cancelCommentEdit();
  }

  function toggleCommentVote(itemKey: string, commentId: string) {
    setWorkItems((items) =>
      items.map((item) =>
        item.key !== itemKey
          ? item
          : {
              ...item,
              comments: (item.comments ?? []).map((comment) => {
                if (comment.id !== commentId) return comment;
                const voters = comment.votes ?? [];
                return {
                  ...comment,
                  votes: voters.includes(CURRENT_USER_NAME)
                    ? voters.filter((voter) => voter !== CURRENT_USER_NAME)
                    : [...voters, CURRENT_USER_NAME],
                };
              }),
            },
      ),
    );
  }

  function renderCell(item: WorkItem, column: ColumnId, rowNumber: number) {
    switch (column) {
      case "number":
        return <span className="work-number-cell">{rowNumber}</span>;
      case "key":
        return <a className="work-key" href={`#${item.key}`}>{item.key}</a>;
      case "title":
        return (
          <div className="work-title-content">
            <span className="work-title-text" title={item.title}>{item.title}</span>
            {canEditWorkItem(item) && (
              <span className="work-title-actions">
                <Button className="work-title-action-button work-icon-action" appearance="subtle" spacing="compact" iconBefore={<EditIcon label="" />} aria-label={`Edit item details for ${item.key}`} onClick={() => openItemDialog(item, "summary")} />
              </span>
            )}
          </div>
        );
      case "createdBy":
        return <span className="work-creator"><UserAvatar name={item.createdBy} />{item.createdBy}</span>;
      case "status":
        return (
          canEditWorkItem(item) ? <StatusDropdown value={item.status} options={statusOrder} appearance={statusAppearance} label="Retro Event" onChange={(status) => {
            setWorkItems((items) => items.map((current) => current.key === item.key ? { ...current, status } : current));
            setSortColumn("status");
            setSortDirection("ascending");
            resetPage();
          }} /> : <Lozenge appearance={statusAppearance(item.status)}>{item.status}</Lozenge>
        );
      case "votes":
        return <VoteControl ticketId={item.key} votes={item.votes} currentUser={CURRENT_USER_NAME} onToggle={() => toggleUpvote(item.key)} />;
      case "comments":
        return <CommentsControl ticketId={item.key} comments={item.comments ?? []} onOpen={() => openItemDialog(item, "comment")} />;
      case "delete":
        return (
          <span className="work-delete-cell">
            {canEditWorkItem(item) && (
              <Button
                ref={(node) => {
                  if (node) deleteActionRefs.current.set(item.key, node);
                  else deleteActionRefs.current.delete(item.key);
                }}
                className="work-delete-action work-icon-action"
                appearance="subtle"
                spacing="compact"
                iconBefore={<DeleteIcon label="" />}
                aria-label={`Delete ${item.key}`}
                onClick={() => setPendingDeleteKey(item.key)}
              />
            )}
          </span>
        );
    }
  }

  const ready = startupDelayElapsed && workItemStatusesReady && actionItemsReady && statusOrderReady && viewStateReady;
  useEffect(() => {
    onReadyChange?.(ready);
  }, [ready, onReadyChange]);

  if (!ready) {
    return (
      <div className="retro-work-loading" role="status" aria-live="polite" aria-busy="true">
        <div className="retro-work-loading-card">
          <span className="retro-work-loading-spinner" aria-hidden="true" />
          <div className="retro-work-loading-copy">
            <strong>Getting your retro board ready</strong>
            <span>Loading your saved work and preferences…</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`retro-work-view${v2View ? " retro-work-view--board" : ""}`}>
      <header className="retro-work-heading">
        <div>
          <div className="retro-board-title">
            <InlineEdit<string>
              defaultValue={boardTitle}
              editButtonLabel="Edit board title"
              confirmButtonLabel="Save title"
              cancelButtonLabel="Cancel title edit"
              validate={(value) => value.trim() ? undefined : "Enter a title"}
              onConfirm={(value: string) => setBoardTitle(value.trim())}
              readView={() => <h1>{boardTitle}</h1>}
              editView={({ errorMessage, ...fieldProps }) => (
                <Textfield {...fieldProps} autoFocus maxLength={120} aria-label="Board title" isInvalid={Boolean(errorMessage)}
                  onFocus={(event) => {
                    fieldProps.onFocus?.();
                    const input = event.currentTarget;
                    input.setSelectionRange(input.value.length, input.value.length);
                  }} />
              )}
            />
          </div>
          <p>Review work items and retro outcomes in one place.</p>
        </div>
        <div
          className="work-heading-actions"
        >
          <ButtonGroup label="Retro board actions">
            <Button
              ref={createButtonRef}
              className="retro-board-action-button"
              appearance="primary"
              spacing="default"
              iconBefore={<AddIcon label="" />}
              onClick={() => openItemDialog()}
            >Create</Button>
            <Button
              className="retro-board-action-button"
              appearance="default"
              spacing="default"
              iconBefore={<PersonAddIcon label="" />}
              onClick={() => setInviteOpen(true)}
            >Invite</Button>
            <Button
              className="retro-board-action-button"
              appearance="default"
              spacing="default"
              iconBefore={<DownloadIcon label="" />}
              aria-expanded={exportOpen}
              onClick={() => setExportOpen(true)}
            >
              Export
            </Button>
            <Button
              className="retro-board-action-button retro-board-close-button"
              appearance="default"
              spacing="default"
              iconBefore={<CrossIcon label="" />}
            >
              Close
            </Button>
          </ButtonGroup>
          <RetroSessionTools items={workItems} actionItems={mayViewActionItems ? actionItems : []} durationMinutes={timerDuration} exportOpen={exportOpen} onExportOpenChange={setExportOpen} />
        </div>
      </header>

      <section className="retro-work-toolbar" aria-label="Work item filters">
        <div className="work-search">
          <Textfield
            className="work-search-field"
            isCompact
            type="search"
            value={query}
            onChange={(event) => {
              setQuery((event.target as HTMLInputElement).value);
              resetPage();
            }}
            placeholder="Search work"
            aria-label="Search work"
            elemBeforeInput={<SearchIcon label="" />}
          />
        </div>

        <div className="retro-event-filter" ref={participantFilterRef}>
          <RetroMultiSelectFilter
            id="retro-participant-filter"
            fieldName="Participants"
            triggerLabel="All participants"
            multipleSelectionLabel="Participants"
            searchPlaceholder="Search participants"
            searchLabel="Search participants"
            options={participantChoices}
            selectedValues={selectedParticipants}
            operator={participantFilterOperator}
            onOperatorChange={(operator) => {
              setParticipantFilterOperator(operator);
              resetPage();
            }}
            onToggle={toggleParticipant}
            searchValue={participantQuery}
            onSearchChange={setParticipantQuery}
            open={openFilter === "participant"}
            onOpenChange={(isOpen) => {
              setStatusOrderOpen(false);
              setOpenOperator(null);
              setOpenFilter(isOpen ? "participant" : null);
            }}
            operatorOpen={openOperator === "participant"}
            onOperatorOpenChange={(isOpen) =>
              setOpenOperator(isOpen ? "participant" : null)
            }
            onClearSelection={() => {
              setSelectedParticipants(new Set());
              resetPage();
            }}
            triggerRef={participantFilterTriggerRef}
          />
        </div>

        <div className="retro-event-filter" ref={statusFilterRef}>
          <RetroMultiSelectFilter
            id="retro-status-filter"
            fieldName="Retro Event"
            triggerLabel="All retro events"
            multipleSelectionLabel="Retro Event"
            searchPlaceholder="Search Retro Events"
            searchLabel="Search Retro Events"
            options={statusChoices}
            selectedValues={selectedStatuses}
            operator={statusFilterOperator}
            onOperatorChange={(operator) => {
              setStatusFilterOperator(operator);
              resetPage();
            }}
            onToggle={toggleStatus}
            searchValue={statusQuery}
            onSearchChange={setStatusQuery}
            open={openFilter === "status"}
            onOpenChange={(isOpen) => {
              setStatusOrderOpen(false);
              setOpenOperator(null);
              setOpenFilter(isOpen ? "status" : null);
            }}
            operatorOpen={openOperator === "status"}
            onOperatorOpenChange={(isOpen) =>
              setOpenOperator(isOpen ? "status" : null)
            }
            onClearSelection={() => {
              setSelectedStatuses(new Set());
              resetPage();
            }}
            triggerRef={statusFilterTriggerRef}
          />
        </div>

        <div className="retro-status-order" ref={statusOrderRef}>
          <Button
            className="retro-event-filter-trigger retro-status-order-trigger"
            appearance="default"
            spacing="default"
            aria-haspopup="dialog"
            aria-expanded={statusOrderOpen}
            aria-controls="retro-status-order-popover"
            iconAfter={<ChevronDownIcon label="" />}
            onClick={() => {
              setOpenFilter(null);
              setOpenOperator(null);
              setStatusOrderOpen((open) => !open);
            }}
          >
            Order Retro Events
          </Button>

          {statusOrderOpen && (
            <section
              className="retro-event-filter-popover retro-status-order-popover"
              id="retro-status-order-popover"
              role="dialog"
              aria-label="Order Retro Events"
            >
              <p>Reorder retro events. Drag a row or use the handle’s arrow keys.</p>
              <ReorderableTable
                items={orderableStatuses}
                onMove={moveStatusInView}
                renderItem={(status) => (
                  <Lozenge appearance={statusAppearance(status)}>{status}</Lozenge>
                )}
              />
            </section>
          )}
        </div>

        <Button
          className="retro-clear-filters"
          appearance="subtle"
          spacing="default"
          isDisabled={!hasActiveFilters}
          onClick={() => {
            setQuery("");
            setSelectedStatuses(new Set());
            setSelectedParticipants(new Set());
            setStatusFilterOperator("equals");
            setParticipantFilterOperator("equals");
            setStatusQuery("");
            setParticipantQuery("");
            setOpenFilter(null);
            setOpenOperator(null);
            setStatusOrderOpen(false);
            resetPage();
          }}
        >
          Clear filters
        </Button>
        {v2View && <div className="work-toolbar-refresh"><WorkRefreshButton onRefresh={refreshWorkTables} /></div>}
      </section>

      {v2View ? (
        <WorkBoard actions={showActionItems ? (
          <ActionItemsTable query={query} view="board-column" items={actionItems} setItems={setActionItems} onRefresh={refreshWorkTables}
            dialogOpen={actionItemDialogOpen} setDialogOpen={setActionItemDialogOpen} />
        ) : undefined}>
          {orderableStatuses.map((status) => {
            const cards = filteredItems.filter((item) => item.status === status);
            return <WorkBoardColumn key={status} title={status} count={cards.length}
              onCreate={() => { openItemDialog(); setCategoryDraft(status); }}>
              {cards.map((item) => <WorkItemCard key={item.key} id={item.key} title={item.title} person={item.createdBy} personLabel="Created by"
                currentUser={CURRENT_USER_NAME}
                votes={item.votes} comments={item.comments ?? []} onVote={() => toggleUpvote(item.key)}
                onComments={() => openItemDialog(item, "comment")} onEdit={() => openItemDialog(item)}
                onDelete={canEditWorkItem(item) ? () => setPendingDeleteKey(item.key) : undefined}

              />)}
            </WorkBoardColumn>;
          })}

        </WorkBoard>
      ) : (
      <section className="work-table-panel" aria-label="Work items">
        <WorkTable
          label="Retro work items"
          head={{
            cells: COLUMNS.map(({ id, label, width }) => ({
              key: id,
              content: <div className="work-header-label">{label}</div>,
              width,
            })),
          }}
          rows={filteredItems.map((item, index) => ({
            key: item.key,
            cells: COLUMNS.map(({ id: column }) => ({
              key: column,
              content: renderCell(item, column, index + 1),
            })),
          }))}
          page={currentPage}
          rowsPerPage={PAGE_SIZE}
          totalRows={filteredItems.length}
          onSetPage={(nextPage) => setPage(nextPage)}
          footerSummary={
            filteredItems.length === 0
              ? "0 items"
              : `Showing ${start + 1}–${Math.min(start + PAGE_SIZE, filteredItems.length)} of ${filteredItems.length}`
          }
          onRefresh={refreshWorkTables}
          emptyView={
            <EmptyState
              header={
                workItems.length === 0
                  ? "No retro items yet"
                  : "No work matches your filters"
              }
              description={
                workItems.length === 0
                  ? "Start the conversation by adding a reflection or outcome from your retrospective."
                  : "Try changing or clearing the current filters to see more work."
              }
              primaryAction={
                workItems.length === 0 ? (
                  <Button
                    appearance="primary"
                    iconBefore={<AddIcon label="" />}
                    onClick={() => openItemDialog()}
                  >
                    Add retro item
                  </Button>
                ) : (
                  <Button
                    appearance="default"
                    isDisabled={!hasActiveFilters}
                    onClick={() => {
                      setQuery("");
                      setSelectedStatuses(new Set());
                      setSelectedParticipants(new Set());
                      setStatusFilterOperator("equals");
                      setParticipantFilterOperator("equals");
                      setStatusQuery("");
                      setParticipantQuery("");
                      resetPage();
                    }}
                  >
                    Clear filters
                  </Button>
                )
              }
              testId="empty-retro-work"
            />
          }
        />
      </section>

      )}

      {!v2View && showActionItems && <>
      <header className="retro-work-heading action-items-heading">
        <div>
          <h2>Action items</h2>
          <p>Track owners, due dates, and progress on your team’s next steps.</p>
        </div>
        <div
          className="work-heading-actions"
        >
          <ButtonGroup label="Action item actions">
            <Button
              className="retro-board-action-button"
              appearance="default"
              spacing="default"
              iconBefore={<AddIcon label="" />}
              onClick={() => setActionItemDialogOpen(true)}
            >
              Create action item
            </Button>
          </ButtonGroup>
        </div>
      </header>
      <ActionItemsTable
        query={query}
        items={actionItems}
        setItems={setActionItems}
        onRefresh={refreshWorkTables}
        dialogOpen={actionItemDialogOpen}
        setDialogOpen={setActionItemDialogOpen}
      />
      </>}

      {inviteOpen && (
        <ModalDialog
          width="medium"
          label="Invite to retro"
          testId="retro-invite-dialog"
          onClose={() => setInviteOpen(false)}
        >
          <RetroModalHeader
            id="retro-invite"
            hasCloseButton
            closeButtonLabel="Close"
          >
            <ModalTitle>Invite to retro</ModalTitle>
          </RetroModalHeader>
          <RetroModalBody id="retro-invite">
            <p className="retro-session-intro">
              Share this link with your teammates to invite them to the retro.
            </p>
            <div className="retro-invite-link">
              <Textfield
                value={
                  typeof window === "undefined" ? "" : window.location.href
                }
                isReadOnly
                aria-label="Retro share link"
              />
              <Button
                appearance="primary"
                iconBefore={<ShareIcon label="" />}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(window.location.href);
                    showFlag({
                      id: "invite-link-copied",
                      title: "Link copied",
                      description: "The retro link is ready to share.",
                      icon: <CheckCircleIcon label="Success" color="var(--ds-icon-success)" />,
                      isAutoDismiss: true,
                    });
                  } catch {
                    showFlag({
                      id: "invite-link-copy-error",
                      title: "Couldn’t copy link",
                      description: "Select the link and copy it manually.",
                      icon: <ErrorIcon label="Error" color="var(--ds-icon-danger)" />,
                      isAutoDismiss: true,
                    });
                  }
                }}
              >
                Copy link
              </Button>
            </div>
          </RetroModalBody>
          <RetroModalFooter id="retro-invite">
            <RetroModalActions label="Invite dialog actions">
              <Button appearance="default" onClick={() => setInviteOpen(false)}>Close</Button>
            </RetroModalActions>
          </RetroModalFooter>
        </ModalDialog>
      )}

      {itemDialogOpen && (
        <ItemModal
          id="retro-work-item"
          type="Retro"
          label={dialogItemKey ? "Edit retro item" : "Create retro item"}
          focusRef={
            dialogFocusTarget === "comment"
              ? commentInputRef
              : summaryTextareaRef
          }
          onOpenComplete={focusDialogInput}
          onClose={closeItemDialog}
          onSubmit={saveItemDialog}
        >
          <RetroModalBody id="work-item" hasInlinePadding={false}>
            <div className="retro-item-dialog-body">
              <ItemFields
                title={summaryDraft}
                description={descriptionDraft}
                onTitleChange={setSummaryDraft}
                onDescriptionChange={setDescriptionDraft}
                titleRef={summaryTextareaRef}
                readOnly={!canEditDialogItem}
              />

              {dialogItemKey && (
                <CommentsSection
                  comments={dialogItem?.comments ?? []}
                  currentUser={CURRENT_USER_NAME}
                  canManageAll={CURRENT_USER_NAME === RETRO_BOARD_CREATOR_NAME}
                  commentDraft={commentDraft}
                  setCommentDraft={setCommentDraft}
                  editingCommentId={editingCommentId}
                  startEditingComment={startEditingComment}
                  cancelCommentEdit={cancelCommentEdit}
                  saveComment={saveComment}
                  deleteComment={(id) => deleteComment(dialogItemKey, id)}
                  toggleCommentVote={(id) =>
                    toggleCommentVote(dialogItemKey, id)
                  }
                  commentInputRef={commentInputRef}
                />
              )}
            </div>
          </RetroModalBody>

          <RetroModalFooter id="work-item">
            <div className="retro-item-dialog-footer">
              <div className="retro-dialog-meta">
                <Lozenge appearance="default">
                  <span className="retro-dialog-creator-chip">
                    <UserAvatar
                      name={dialogItem?.createdBy ?? CURRENT_USER_NAME}
                    />
                    {dialogItem?.createdBy ?? CURRENT_USER_NAME}
                  </span>
                </Lozenge>
                {canEditDialogItem ? (
                  <StatusDropdown
                    value={categoryDraft}
                    options={statusOrder}
                    appearance={statusAppearance}
                    label="Retro Event"
                    placement="top-start"
                    onChange={setCategoryDraft}
                  />
                ) : (
                  <Lozenge appearance={statusAppearance(categoryDraft)}>
                    {categoryDraft}
                  </Lozenge>
                )}
              </div>
              <div className="retro-dialog-actions">
                <RetroModalActions label="Retro item form actions">
                  <Button
                    type="button"
                    appearance="default"
                    onClick={closeItemDialog}
                  >
                    Cancel
                  </Button>
                  {canEditDialogItem && (
                    <Button
                      appearance="primary"
                      type="submit"
                      isDisabled={!summaryDraft.trim()}
                    >
                      {dialogItemKey ? "Save" : "Create"}
                    </Button>
                  )}
                </RetroModalActions>
              </div>
            </div>
          </RetroModalFooter>
        </ItemModal>
      )}

      {pendingDeleteItem && (
        <ModalDialog
          width="small"
          testId="retro-delete-confirmation"
          label={`Delete ${pendingDeleteItem.key}?`}
          onClose={() => setPendingDeleteKey(null)}
          onCloseComplete={() => {
            if (!restoreFocusAfterDeleteRef.current) return;
            const nextRowButton = focusAfterDeleteRef.current
              ? deleteActionRefs.current.get(focusAfterDeleteRef.current)
              : null;
            (nextRowButton ?? createButtonRef.current)?.focus();
            restoreFocusAfterDeleteRef.current = false;
            focusAfterDeleteRef.current = null;
          }}
        >
          <RetroModalHeader
            id="delete-confirmation"
            hasCloseButton
            closeButtonLabel="Close"
          >
            <ModalTitle appearance="danger">Delete retro item?</ModalTitle>
          </RetroModalHeader>
          <RetroModalBody id="delete-confirmation">
            <p>
              <strong>{pendingDeleteItem.key}</strong> and its comments and
              votes will be permanently removed. This action can’t be undone.
            </p>
          </RetroModalBody>
          <RetroModalFooter id="delete-confirmation">
            <RetroModalActions label="Delete retro item actions">
              <Button
                appearance="default"
                onClick={() => setPendingDeleteKey(null)}
              >
                Cancel
              </Button>
              <Button appearance="danger" onClick={confirmDeleteWorkItem}>
                Delete
              </Button>
            </RetroModalActions>
          </RetroModalFooter>
        </ModalDialog>
      )}
    </div>
  );
}
