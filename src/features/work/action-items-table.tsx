"use client";
import { useRef, useState } from "react";
import Button from "@atlaskit/button/button";
import EmptyState from "@atlaskit/empty-state";
import { WorkBoardColumn, WorkItemCard } from "./work-board";
import { matchesWorkSearch } from "./work-search";
import DeleteIcon from "@atlaskit/icon/core/delete";
import EditIcon from "@atlaskit/icon/core/edit";
import ModalDialog, { ModalTitle } from "@atlaskit/modal-dialog";
import type { ThemeAppearance } from "@atlaskit/lozenge";
import { UserAvatar } from "@/shared/user-avatar";
import {
  RetroModalActions,
  RetroModalBody,
  RetroModalFooter,
  RetroModalHeader,
} from "@/shared/design-system/retro-modal-parts";
import {
  WorkTable,
  VoteControl,
  CommentsControl,
  CommentsSection,
  ItemFields,
  ItemModal,
  StatusDropdown,
  type WorkComment,
} from "./work-item-components";
import {
  CURRENT_USER_NAME,
  RETRO_BOARD_CREATOR_NAME,
} from "./work-item-constants";
import {
  OwnerPicker,
  DueDatePicker,
  type AssigneeOption,
} from "./work-item-pickers";
import mockAttendance from "@/features/navigation/mock-retro-attendance.json";
import mockActionItems from "./mock-action-items.json";

const actionItemPeople = [
  ...new Set([
    CURRENT_USER_NAME,
    ...mockAttendance.attendees.map((attendee) => attendee.name),
  ]),
];
const ACTION_STATUSES = ["To do", "In progress", "Done"] as const;
const ACTION_ITEMS_PAGE_SIZE = 10;
type ActionItemStatus = (typeof ACTION_STATUSES)[number];
export type ActionItem = (typeof mockActionItems)[number] & {
  key?: string;
  description?: string;
  status?: ActionItemStatus;
  votes?: string[];
  comments?: WorkComment[];
};

const actionAssigneeOptions: AssigneeOption[] = actionItemPeople.map(
  (name) => ({
    label: name,
    value: name,
    email:
      name === CURRENT_USER_NAME ? "panchal.rajan2k19@gmail.com" : undefined,
  }),
);

function actionItemTicketId(item: ActionItem, index: number): string {
  if (item.key) return item.key;
  const match = item.id.match(/^ACTION-(\d+)$/);
  const numericId = match ? Number(match[1]) : Number.NaN;
  const sequence =
    Number.isSafeInteger(numericId) && numericId < 10000
      ? numericId
      : index + 1;
  return `ACTION-${String(sequence).padStart(4, "0")}`;
}

export function ActionItemsTable({
  view = "table",
  query = "",
  items,
  setItems,
  onRefresh,
  dialogOpen,
  setDialogOpen,
}: {
  view?: "table" | "board-column";
  query?: string;
  items: ActionItem[];
  setItems: (
    items: ActionItem[] | ((current: ActionItem[]) => ActionItem[]),
  ) => void;
  onRefresh: () => void;
  dialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [owner, setOwner] = useState(CURRENT_USER_NAME);
  const [dueDate, setDueDate] = useState("");
  const [actionStatus, setActionStatus] = useState<ActionItemStatus>("To do");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [pendingDeleteItemId, setPendingDeleteItemId] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ query, page: 1 });
  const page = pagination.query === query ? pagination.page : 1;
  const setPage = (nextPage: number) => setPagination({ query, page: nextPage });
  const visibleItems = items.filter((item, index) => matchesWorkSearch(query, [
    actionItemTicketId(item, index), item.title, item.description, item.owner,
    item.status ?? (item.done ? "Done" : "To do"),
  ]));
  const pageCount = Math.max(1, Math.ceil(visibleItems.length / ACTION_ITEMS_PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const editingItem = items.find((item) => item.id === editingItemId);
  const pendingDeleteItem = items.find((item) => item.id === pendingDeleteItemId);
  const actionTitleRef = useRef<HTMLTextAreaElement>(null);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  const [focusTarget, setFocusTarget] = useState<"title" | "comment">("title");
  const statusAppearance = (status: ActionItemStatus): ThemeAppearance =>
    status === "Done"
      ? "success"
      : status === "In progress"
        ? "inprogress"
        : "default";
  function closeDialog() {
    setFocusTarget("title");
    setDialogOpen(false);
    setEditingItemId(null);
    setCommentDraft("");
    setEditingCommentId(null);
    setTitle("");
    setDescription("");
    setOwner(CURRENT_USER_NAME);
    setDueDate("");
    setActionStatus("To do");
  }
  function openEditDialog(item: ActionItem, target: "title" | "comment" = "title") {
    setFocusTarget(target);
    setEditingItemId(item.id);
    setTitle(item.title);
    setDescription(item.description ?? "");
    setOwner(
      item.owner && !["Automatic", "Unassigned"].includes(item.owner)
        ? item.owner
        : CURRENT_USER_NAME,
    );
    setDueDate(item.dueDate);
    setActionStatus(item.status ?? (item.done ? "Done" : "To do"));
    setDialogOpen(true);
  }
  function toggleActionVote(itemId: string) {
    setItems((current) =>
      current.map((item) => {
        if (item.id !== itemId) return item;
        const votes = item.votes ?? [];
        return {
          ...item,
          votes: votes.includes(CURRENT_USER_NAME)
            ? votes.filter((voter) => voter !== CURRENT_USER_NAME)
            : [...votes, CURRENT_USER_NAME],
        };
      }),
    );
  }
  function saveActionComment() {
    const text = commentDraft.trim();
    if (!text || !editingItemId) return;
    setItems((current) =>
      current.map((item) => {
        if (item.id !== editingItemId) return item;
        const comments = item.comments ?? [];
        return {
          ...item,
          comments: editingCommentId
            ? comments.map((comment) =>
                comment.id === editingCommentId
                  ? { ...comment, text }
                  : comment,
              )
            : [
                ...comments,
                {
                  id: `${Date.now()}`,
                  author: CURRENT_USER_NAME,
                  text,
                  createdAt: new Date().toISOString(),
                  votes: [],
                },
              ],
        };
      }),
    );
    setEditingCommentId(null);
    setCommentDraft("");
  }
  function toggleActionCommentVote(itemId: string, commentId: string) {
    setItems((current) =>
      current.map((item) =>
        item.id !== itemId
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
  function save() {
    const cleanTitle = title.trim();
    if (!cleanTitle) return;
    setItems((current) => {
      if (editingItemId)
        return current.map((item) =>
          item.id === editingItemId
            ? {
                ...item,
                title: cleanTitle,
                description: description.trim(),
                owner: owner === "Unassigned" ? "" : owner,
                dueDate,
                done: actionStatus === "Done",
                status: actionStatus,
              }
            : item,
        );
      const maxSequence = current.reduce(
        (max, item, index) =>
          Math.max(
            max,
            Number(actionItemTicketId(item, index).slice("ACTION-".length)),
          ),
        0,
      );
      const key = `ACTION-${String(maxSequence + 1).padStart(4, "0")}`;
      return [
        ...current,
        {
          id: key,
          key,
          title: cleanTitle,
          description: description.trim(),
          owner: owner === "Unassigned" ? "" : owner,
          dueDate,
          done: actionStatus === "Done",
          status: actionStatus,
        },
      ];
    });
    closeDialog();
  }
  const rows = visibleItems.map((item, index) => {
    const ticketId = actionItemTicketId(item, items.indexOf(item));
    const status = item.status ?? (item.done ? "Done" : "To do");
    return {
      key: item.id,
      cells: [
        {
          key: "number",
          content: <span className="work-number-cell">{index + 1}</span>,
        },
        {
          key: "key",
          content: <a className="work-key" href={`#${ticketId}`}>{ticketId}</a>,
        },
        {
          key: "title",
          content: (
            <div className="work-title-content">
              <span className="work-title-text" title={item.title}>{item.title}</span>
              <span className="work-title-actions">
                <Button
                  className="work-title-action-button work-icon-action"
                  appearance="subtle"
                  spacing="compact"
                  iconBefore={<EditIcon label="" />}
                  aria-label={`Edit ${ticketId}`}
                  onClick={() => openEditDialog(item)}
                />
              </span>
            </div>
          ),
        },
        {
          key: "owner",
          content: (
            <span className="work-creator">
              <UserAvatar name={item.owner || "Unassigned"} />
              {item.owner || "Unassigned"}
            </span>
          ),
        },
        {
          key: "status",
          content: (
            <StatusDropdown
              value={status}
              options={ACTION_STATUSES}
              appearance={statusAppearance}
              label="Status"
              placement="bottom-start"
              onChange={(nextStatus) =>
                setItems((current) =>
                  current.map((entry) =>
                    entry.id === item.id
                      ? { ...entry, status: nextStatus, done: nextStatus === "Done" }
                      : entry,
                  ),
                )
              }
            />
          ),
        },
        {
          key: "dueDate",
          content: (
            <DueDatePicker
              value={item.dueDate}
              onChange={(dueDate) =>
                setItems((current) =>
                  current.map((entry) =>
                    entry.id === item.id ? { ...entry, dueDate } : entry,
                  ),
                )
              }
            />
          ),
        },
        {
          key: "votes",
          content: (
            <VoteControl
              ticketId={ticketId}
              votes={item.votes ?? []}
              currentUser={CURRENT_USER_NAME}
              onToggle={() => toggleActionVote(item.id)}
            />
          ),
        },
        {
          key: "comments",
          content: (
            <CommentsControl
              ticketId={ticketId}
              comments={item.comments ?? []}
              onOpen={() => {
                openEditDialog(item, "comment");
                setCommentDraft("");
                setEditingCommentId(null);
              }}
            />
          ),
        },
        {
          key: "delete",
          content: (
            <span className="work-delete-cell">
              <Button
                className="work-delete-action work-icon-action"
                appearance="subtle"
                spacing="compact"
                iconBefore={<DeleteIcon label="" />}
                aria-label={`Delete ${ticketId}`}
                onClick={() => setPendingDeleteItemId(item.id)}
              />
            </span>
          ),
        },
      ],
    };
  });

  return (
    <>
      {view === "board-column" ? (
        <WorkBoardColumn title="Action items" count={visibleItems.length} onCreate={() => setDialogOpen(true)} pinned
          emptyState={items.length > 0 && query.trim() ? <EmptyState header="No matching action items" headingSize="xsmall" description="Try another search term." /> : undefined}>
          {visibleItems.map((item) => {
            const id = actionItemTicketId(item, items.indexOf(item));
            const status = item.status ?? (item.done ? "Done" : "To do");
            return <WorkItemCard key={item.id} id={id} title={item.title} person={item.owner || "Unassigned"} personLabel="Owner"
              currentUser={CURRENT_USER_NAME} votes={item.votes ?? []} comments={item.comments ?? []}
              onVote={() => toggleActionVote(item.id)} onComments={() => { openEditDialog(item, "comment"); setCommentDraft(""); setEditingCommentId(null); }}
              onEdit={() => openEditDialog(item)} onDelete={() => setPendingDeleteItemId(item.id)}
              statusControl={<StatusDropdown value={status} options={ACTION_STATUSES} appearance={statusAppearance} label="Status"
                onChange={(nextStatus) => setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, status: nextStatus, done: nextStatus === "Done" } : entry))} />}
              dueDateControl={<DueDatePicker value={item.dueDate} onChange={(dueDate) => setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, dueDate } : entry))} />}
            />;
          })}
        </WorkBoardColumn>
      ) : (
      <section
        className="work-table-panel action-items-panel"
        aria-label="Action items"
      >
        <WorkTable
          label="Action items"
          head={{
            cells: [
              "#",
              "Ticket ID",
              "Action item",
              "Owner",
              "Status",
              "Due date",
              "Votes",
              "Comments",
              "Actions",
            ].map((content, index) => ({
              content: <div className="work-header-label">{content}</div>,
              width: [3, 10, 34, 12, 10, 12, 6, 7, 6][index],
            })),
          }}
          page={currentPage}
          rowsPerPage={ACTION_ITEMS_PAGE_SIZE}
          totalRows={visibleItems.length}
          onSetPage={setPage}
          footerSummary={
            visibleItems.length === 0
              ? "0 action items"
              : `Showing ${(currentPage - 1) * ACTION_ITEMS_PAGE_SIZE + 1}–${Math.min(currentPage * ACTION_ITEMS_PAGE_SIZE, visibleItems.length)} of ${visibleItems.length}`
          }
          onRefresh={() => {
            setPage(1);
            onRefresh();
          }}
          emptyView={
            <EmptyState
              header={items.length > 0 ? "No matching action items" : "No action items yet"}
              description={items.length > 0 ? "Try another search term." : "Capture a clear next step from this retrospective so your team can follow through."}
              primaryAction={items.length === 0 ?
                <Button appearance="primary" onClick={() => setDialogOpen(true)}>
                  Create action item
                </Button> : undefined
              }
              testId="empty-action-items"
            />
          }
          rows={rows}
          />
      </section>
      )}
      {dialogOpen && (
        <ItemModal
          id="create-action-item"
          type="Action item"
          label={editingItemId ? "Edit action item" : "Create action item"}
          focusRef={focusTarget === "comment" ? commentInputRef : actionTitleRef}
          onOpenComplete={() => {
            const input = (focusTarget === "comment" ? commentInputRef : actionTitleRef).current;
            if (!input) return;
            input.focus();
            input.setSelectionRange(input.value.length, input.value.length);
          }}
          onClose={closeDialog}
          onSubmit={save}
        >
          <RetroModalBody id="create-action-item" hasInlinePadding={false}>
            <div className="retro-item-dialog-body action-item-form">
              <ItemFields
                title={title}
                description={description}
                onTitleChange={setTitle}
                onDescriptionChange={setDescription}
                titleRef={actionTitleRef}
              />
              {editingItem && (
                <CommentsSection
                  commentInputRef={commentInputRef}
                  comments={editingItem.comments ?? []}
                  currentUser={CURRENT_USER_NAME}
                  canManageAll={CURRENT_USER_NAME === RETRO_BOARD_CREATOR_NAME}
                  commentDraft={commentDraft}
                  setCommentDraft={setCommentDraft}
                  editingCommentId={editingCommentId}
                  startEditingComment={(comment) => {
                    setEditingCommentId(comment.id);
                    setCommentDraft(comment.text);
                  }}
                  cancelCommentEdit={() => {
                    setEditingCommentId(null);
                    setCommentDraft("");
                  }}
                  saveComment={saveActionComment}
                  deleteComment={(id) => {
                    setItems((current) =>
                      current.map((entry) =>
                        entry.id === editingItem.id
                          ? {
                              ...entry,
                              comments: (entry.comments ?? []).filter(
                                (comment) => comment.id !== id,
                              ),
                            }
                          : entry,
                      ),
                    );
                    if (editingCommentId === id) {
                      setEditingCommentId(null);
                      setCommentDraft("");
                    }
                  }}
                  toggleCommentVote={(id) =>
                    toggleActionCommentVote(editingItem.id, id)
                  }
                />
              )}
            </div>
          </RetroModalBody>
          <RetroModalFooter id="create-action-item">
            <div className="retro-item-dialog-footer">
              <div className="retro-dialog-meta action-item-meta">
                {" "}
                <OwnerPicker
                  value={owner}
                  onChange={setOwner}
                  options={actionAssigneeOptions}
                  currentUser={CURRENT_USER_NAME}
                />
                <StatusDropdown
                  value={actionStatus}
                  options={ACTION_STATUSES}
                  appearance={statusAppearance}
                  label="Status"
                  placement="bottom-start"
                  onChange={setActionStatus}
                />
                <DueDatePicker value={dueDate} onChange={setDueDate} />
              </div>
              <div className="retro-dialog-actions">
                <RetroModalActions label="Action item form actions">
                  <Button type="button" appearance="default" onClick={closeDialog}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    appearance="primary"
                    isDisabled={!title.trim()}
                  >
                    {editingItemId ? "Update" : "Create"}
                  </Button>
                </RetroModalActions>
              </div>
            </div>
          </RetroModalFooter>
        </ItemModal>
      )}
      {pendingDeleteItem && (
        <ModalDialog
          width="small"
          testId="action-item-delete-confirmation"
          label={`Delete ${actionItemTicketId(pendingDeleteItem, items.indexOf(pendingDeleteItem))}?`}
          onClose={() => setPendingDeleteItemId(null)}
        >
          <RetroModalHeader
            id="action-item-delete-confirmation"
            hasCloseButton
            closeButtonLabel="Close"
          >
            <ModalTitle appearance="danger">Delete action item?</ModalTitle>
          </RetroModalHeader>
          <RetroModalBody id="action-item-delete-confirmation">
            <p>
              <strong>{actionItemTicketId(pendingDeleteItem, items.indexOf(pendingDeleteItem))}</strong> and its comments and
              votes will be permanently removed. This action can’t be undone.
            </p>
          </RetroModalBody>
          <RetroModalFooter id="action-item-delete-confirmation">
            <RetroModalActions label="Delete action item actions">
              <Button appearance="default" onClick={() => setPendingDeleteItemId(null)}>
                Cancel
              </Button>
              <Button
                appearance="danger"
                onClick={() => {
                  setItems((current) => current.filter((item) => item.id !== pendingDeleteItem.id));
                  setPendingDeleteItemId(null);
                }}
              >
                Delete
              </Button>
            </RetroModalActions>
          </RetroModalFooter>
        </ModalDialog>
      )}
    </>
  );
}
