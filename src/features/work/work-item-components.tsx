"use client";
import {
  useId,
  useEffect,
  useRef,
  type ReactChild,
  type ReactNode,
  type ReactElement,
  type RefObject,
} from "react";
import Button from "@atlaskit/button/button";
import ButtonGroup from "@atlaskit/button/button-group";
import DynamicTableStateless from "@atlaskit/dynamic-table/stateless";
import type { HeadType, RowType } from "@atlaskit/dynamic-table/types";
import DropdownMenu, {
  DropdownItem,
  DropdownItemGroup,
} from "@atlaskit/dropdown-menu";
import ChevronDownIcon from "@atlaskit/icon/core/chevron-down";
import ChevronLeftIcon from "@atlaskit/icon/core/chevron-left";
import ChevronRightIcon from "@atlaskit/icon/core/chevron-right";
import RefreshIcon from "@atlaskit/icon/core/refresh";
import ThumbsUpIcon from "@atlaskit/icon/core/thumbs-up";
import CommentIcon from "@atlaskit/icon/core/comment";
import EditIcon from "@atlaskit/icon/core/edit";
import DeleteIcon from "@atlaskit/icon/core/delete";
import Comment, {
  CommentAuthor,
  CommentTime,
} from "@atlaskit/comment";
import ModalDialog from "@atlaskit/modal-dialog";
import { RetroModalHeader } from "@/shared/design-system/retro-modal-parts";
import TextArea from "@atlaskit/textarea";
import Lozenge, {
  LozengeDropdownTrigger,
  type ThemeAppearance,
} from "@atlaskit/lozenge";
import { UserAvatar } from "@/shared/user-avatar";
export type WorkComment = {
  id: string;
  author: string;
  text: string;
  createdAt: string;
  votes?: string[];
};

export function WorkRefreshButton({ onRefresh }: { onRefresh: () => void }) {
  return <Button className="work-refresh-button" appearance="subtle" spacing="compact" iconBefore={<RefreshIcon label="" />} onClick={onRefresh}>
    Refresh
  </Button>;
}

export function WorkTable({
  label,
  head,
  rows,
  page,
  rowsPerPage,
  totalRows,
  onSetPage,
  emptyView,
  footerSummary,
  onRefresh,
}: {
  label: string;
  head: HeadType;
  rows: RowType[];
  page: number;
  rowsPerPage: number;
  totalRows: number;
  onSetPage: (page: number) => void;
  emptyView: ReactElement;
  footerSummary: ReactNode;
  onRefresh: () => void;
}) {
  const pageRows = rows.slice((page - 1) * rowsPerPage, page * rowsPerPage);
  const pageCount = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  return (
    <>
      <div className="work-table-scroll">
        <DynamicTableStateless
          label={label}
          testId={`work-table-${label.toLowerCase().replaceAll(" ", "-")}`}
          head={head}
          rows={pageRows}
          emptyView={emptyView}
          isFixedSize
        />
      </div>
      <footer className="work-table-footer">
        <span aria-live="polite">{footerSummary}</span>
        <nav className="work-pagination" aria-label={`${label} pages`}>
          {totalRows > 0 ? (
            <>
              <Button
                appearance="subtle"
                spacing="compact"
                className="work-page-button"
                iconBefore={<ChevronLeftIcon label="" />}
                aria-label="Previous page"
                isDisabled={page === 1}
                onClick={() => onSetPage(Math.max(1, page - 1))}
              />
              {Array.from({ length: pageCount }, (_, index) => index + 1).map(
                (pageNumber) => (
                  <Button
                    key={pageNumber}
                    appearance={pageNumber === page ? "default" : "subtle"}
                    spacing="compact"
                    className="work-page-button"
                    aria-current={pageNumber === page ? "page" : undefined}
                    aria-label={`Page ${pageNumber}`}
                    onClick={() => onSetPage(pageNumber)}
                  >
                    {pageNumber}
                  </Button>
                ),
              )}
              <Button
                appearance="subtle"
                spacing="compact"
                className="work-page-button"
                iconBefore={<ChevronRightIcon label="" />}
                aria-label="Next page"
                isDisabled={page === pageCount}
                onClick={() => onSetPage(Math.min(pageCount, page + 1))}
              />
            </>
          ) : null}
        </nav>
        <div className="work-table-footer-end">
          <WorkRefreshButton onRefresh={onRefresh} />
        </div>
      </footer>
    </>
  );
}

export function WorkItemEngagement({
  icon,
  actionLabel,
  count,
  onAction,
  countControl,
  active,
  compact = false,
  isDisabled = false,
}: {
  isDisabled?: boolean;
  icon: ReactChild;
  actionLabel: string;
  count: number;
  onAction: () => void;
  countControl?: ReactNode;
  active?: boolean;
  compact?: boolean;
}) {
  return (
    <span className={`work-engagement-controls${compact ? " work-engagement-controls--compact" : ""}`} data-active={compact && active ? "true" : undefined} data-has-count={compact && count > 0 ? "true" : undefined}>
      <Button
        className="work-engagement-action"
        appearance={active && !compact ? "primary" : "subtle"}
        spacing="compact"
        iconBefore={icon}
        aria-label={actionLabel}
        aria-pressed={active}
        onClick={onAction}
        isDisabled={isDisabled}
      />
      {count > 0 ? compact ? <span className="work-engagement-count-segment">{countControl}</span> : countControl : null}
    </span>
  );
}

export function VoteControl({
  ticketId,
  votes,
  currentUser,
  onToggle,
  compact = true,
  voterNames = {},
  isDisabled = false,
}: {
  isDisabled?: boolean;
  voterNames?: Record<string, string>;
  ticketId: string;
  votes: string[];
  currentUser: string;
  onToggle: () => void;
  compact?: boolean;
}) {
  return (
    <WorkItemEngagement
      compact={compact}
      icon={<ThumbsUpIcon label="" size={compact ? "small" : "medium"} />}
      actionLabel={`${votes.includes(currentUser) ? "Remove upvote from" : "Upvote"} ${ticketId}`}
      count={votes.length}
      isDisabled={isDisabled}
      onAction={onToggle}
      active={votes.includes(currentUser)}
      countControl={
        <DropdownMenu
          label={`Show ${votes.length} votes for ${ticketId}`}
          menuLabel={`People who voted on ${ticketId}`}
          placement="bottom-start"
          spacing="compact"
          trigger={({ triggerRef, onClick, ...triggerProps }) => (
            <Button
              {...triggerProps}
              ref={triggerRef}
              appearance="subtle"
              spacing="compact"
              aria-label={`Show ${votes.length} votes for ${ticketId}`}
              className={compact ? "work-engagement-count" : undefined}
              iconAfter={compact ? undefined : <ChevronDownIcon label="" />}
              onClick={onClick}
            >
              {votes.length}
            </Button>
          )}
        >
          <DropdownItemGroup title="Voted by">
            {votes.length === 0 && <DropdownItem isDisabled>No votes yet</DropdownItem>}
            {votes.map((voter) => (
              <DropdownItem key={voter} isDisabled>
                <span className="vote-person">
                  <UserAvatar name={voterNames[voter] ?? voter} />
                  {voterNames[voter] ?? voter}
                </span>
              </DropdownItem>
            ))}
          </DropdownItemGroup>
        </DropdownMenu>
      }
    />
  );
}

export function CommentsControl({
  ticketId,
  comments,
  onOpen,
  compact = true,
}: {
  ticketId: string;
  comments: WorkComment[];
  onOpen: () => void;
  compact?: boolean;
}) {
  return (
    <WorkItemEngagement
      compact={compact}
      icon={<CommentIcon label="" size={compact ? "small" : "medium"} />}
      actionLabel={`Open comments for ${ticketId}`}
      count={comments.length}
      onAction={onOpen}
      countControl={
        <DropdownMenu
          label={`Show ${comments.length} comments for ${ticketId}`}
          menuLabel={`Comments for ${ticketId}`}
          placement="bottom-end"
          spacing="compact"
          trigger={({ triggerRef, onClick, ...triggerProps }) => (
            <Button
              {...triggerProps}
              ref={triggerRef}
              appearance="subtle"
              spacing="compact"
              aria-label={`${comments.length} comments for ${ticketId}`}
              className={compact ? "work-engagement-count" : undefined}
              iconAfter={compact ? undefined : <ChevronDownIcon label="" />}
              onClick={onClick}
            >
              {comments.length}
            </Button>
          )}
        >
          <DropdownItemGroup title="Comments">
            {comments.length === 0 && <DropdownItem isDisabled>No comments yet</DropdownItem>}
            {comments.map((comment) => (
              <DropdownItem key={comment.id} isDisabled>
                <span className="work-comment-preview">
                  <strong>{comment.author}</strong>
                  <span>{comment.text}</span>
                </span>
              </DropdownItem>
            ))}
          </DropdownItemGroup>
        </DropdownMenu>
      }
    />
  );
}

function formatCommentDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
      }).format(date);
}
export function CommentsSection({
  comments,
  currentUser,
  canManageAll,
  commentDraft,
  setCommentDraft,
  editingCommentId,
  startEditingComment,
  cancelCommentEdit,
  saveComment,
  deleteComment,
  toggleCommentVote,
  commentInputRef,
}: {
  comments: WorkComment[];
  currentUser: string;
  canManageAll: boolean;
  commentDraft: string;
  setCommentDraft: (value: string) => void;
  editingCommentId: string | null;
  startEditingComment: (comment: WorkComment) => void;
  cancelCommentEdit: () => void;
  saveComment: () => void;
  deleteComment: (id: string) => void;
  toggleCommentVote: (id: string) => void;
  commentInputRef?: RefObject<HTMLTextAreaElement>;
}) {
  const headingId = useId();
  const editInputRef = useRef<HTMLTextAreaElement>(null);
  const previousEditingId = useRef<string | null>(null);
  useEffect(() => {
    const input = editingCommentId ? editInputRef.current : previousEditingId.current ? commentInputRef?.current : null;
    if (input) {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }
    previousEditingId.current = editingCommentId;
  }, [editingCommentId, commentInputRef]);
  return (
    <section className="retro-dialog-comments" aria-labelledby={headingId}>
      <h3 id={headingId}>
        Comments <span>{comments?.length ?? 0}</span>
      </h3>
      {(comments?.length ?? 0) > 0 ? (
        <ul className="retro-comment-list">
          {(comments ?? []).map((comment) => {
            const commentVoters = comment.votes ?? [];
            const canManageThisComment =
              canManageAll || comment.author === currentUser;
            const actions = [
              <span key="comment-actions" className="retro-comment-actions">
                <VoteControl compact ticketId={`comment by ${comment.author}`} votes={commentVoters}
                  currentUser={currentUser} onToggle={() => toggleCommentVote(comment.id)} />
                {canManageThisComment && <>
                  <Button className="work-icon-action" appearance="subtle" spacing="compact"
                    iconBefore={<EditIcon label="" size="small" />} aria-label={`Edit comment by ${comment.author}`}
                    onClick={() => startEditingComment(comment)} />
                  <Button className="work-icon-action work-delete-action" appearance="subtle" spacing="compact"
                    iconBefore={<DeleteIcon label="" size="small" />} aria-label={`Delete comment by ${comment.author}`}
                    onClick={() => deleteComment(comment.id)} />
                </>}
              </span>,
            ];
            return (
              <li key={comment.id}>
                <Comment
                  avatar={<UserAvatar name={comment.author} />}
                  author={<CommentAuthor>{comment.author}</CommentAuthor>}
                  time={
                    <CommentTime>
                      {formatCommentDate(comment.createdAt)}
                    </CommentTime>
                  }
                  content={editingCommentId === comment.id ? (
                    <div className="retro-comment-inline-editor">
                      <TextArea ref={editInputRef} value={commentDraft}
                        onChange={(event) => setCommentDraft(event.target.value)}
                        aria-label={`Edit comment by ${comment.author}`} minimumRows={2} maxHeight="240px" resize="smart"
                        onKeyDown={(event) => {
                          if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); cancelCommentEdit(); }
                          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) { event.preventDefault(); if (commentDraft.trim()) saveComment(); }
                        }} />
                      <div className="retro-comment-compose-actions">
                        <ButtonGroup label="Edit comment actions">
                          <Button onClick={cancelCommentEdit}>Cancel</Button>
                          <Button appearance="primary" isDisabled={!commentDraft.trim()} onClick={saveComment}>Save</Button>
                        </ButtonGroup>
                      </div>
                    </div>
                  ) : <p>{comment.text}</p>}
                  actions={editingCommentId === comment.id ? undefined : actions}
                />
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="retro-comments-empty">No comments yet.</p>
      )}
      {!editingCommentId && (
        <div className="retro-comment-compose">
          <UserAvatar name={currentUser} />
          <div className="retro-comment-compose-content">
            <TextArea
              id={`${headingId}-draft`}
              ref={commentInputRef}
              className="retro-comment-composer-field"
              minimumRows={3}
              maxHeight="240px"
              resize="vertical"
              appearance="standard"
              value={commentDraft}
              onChange={(event) => setCommentDraft(event.target.value)}
              placeholder="Add a comment..."
              aria-label="Add a comment"
              onKeyDown={(event) => {
                if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                  event.preventDefault();
                  saveComment();
                }
              }}
            />
            <div className="retro-comment-compose-actions">
              <span className="retro-comment-compose-hint">
                Press ⌘ Enter to submit
              </span>
              <Button
                type="button"
                appearance="primary"
                isDisabled={!commentDraft.trim()}
                onClick={saveComment}
              >
                Add comment
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export function ItemBrand({ type }: { type: string }) {
  return (
    <div className="retro-item-dialog-brand">
      <span className="retrospace-brand-mark" aria-hidden="true" />
      <span>retrospace</span>
      <span className="retro-item-dialog-divider" />
      <span className="retro-item-type">{type}</span>
    </div>
  );
}
export function ItemFields({
  title,
  description,
  onTitleChange,
  onDescriptionChange,
  titleRef,
  readOnly = false,
}: {
  title: string;
  description: string;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  titleRef: RefObject<HTMLTextAreaElement>;
  readOnly?: boolean;
}) {
  const id = useId();
  return (
    <>
      <TextArea
        ref={titleRef}
        id={`${id}-summary`}
        className="retro-dialog-summary-field"
        value={title}
        onChange={(event) => onTitleChange(event.target.value)}
        placeholder="Summary"
        aria-label="Summary"
        isRequired
        isReadOnly={readOnly}
        appearance="subtle"
        minimumRows={1}
        maxHeight="calc(3lh + var(--ds-space-075) + var(--ds-space-075) + var(--ds-border-width) + var(--ds-border-width))"
        resize="smart"
      />
      <TextArea
        className="retro-dialog-textarea"
        value={description}
        onChange={(event) => onDescriptionChange(event.target.value)}
        placeholder="Add more detail (optional)"
        aria-label="Description"
        isReadOnly={readOnly}
        appearance="subtle"
        minimumRows={3}
        maxHeight="160px"
        resize="vertical"
      />
    </>
  );
}
export function StatusDropdown<T extends string>({
  value,
  options,
  onChange,
  appearance,
  label,
  placement = "bottom-start",
  triggerAppearance = "lozenge",
}: {
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
  appearance: (value: T) => ThemeAppearance;
  label: string;
  placement?: "bottom-start" | "top-start";
  triggerAppearance?: "lozenge" | "button";
}) {
  return (
    <DropdownMenu
      label={label}
      menuLabel={label}
      placement={placement}
      spacing="compact"
      trigger={({ triggerRef, onClick, ...props }) =>
        triggerAppearance === "button" ? (
          <Button
            {...props}
            ref={triggerRef}
            appearance="default"
            iconAfter={<ChevronDownIcon label="" />}
            aria-label={`${label}, currently ${value}`}
            onClick={onClick}
          >
            {value}
          </Button>
        ) : (
          <LozengeDropdownTrigger
            {...props}
            ref={triggerRef}
            appearance={appearance(value)}
            aria-label={`${label}, currently ${value}`}
            onClick={onClick}
          >
            {value}
          </LozengeDropdownTrigger>
        )
      }
    >
      <DropdownItemGroup title={label}>
        {options.map((option) => (
          <DropdownItem
            key={option}
            isSelected={option === value}
            onClick={() => onChange(option)}
          >
            <Lozenge appearance={appearance(option)}>{option}</Lozenge>
          </DropdownItem>
        ))}
      </DropdownItemGroup>
    </DropdownMenu>
  );
}

export function ItemModal({
  id,
  label,
  type,
  focusRef,
  onOpenComplete,
  onClose,
  onSubmit,
  children,
}: {
  id: string;
  label: string;
  type: string;
  focusRef: RefObject<HTMLTextAreaElement>;
  onOpenComplete?: () => void;
  onClose: () => void;
  onSubmit: () => void;
  children: ReactNode;
}) {
  return (
    <ModalDialog
      width="large"
      label={label}
      testId={id}
      autoFocus={focusRef}
      onOpenComplete={onOpenComplete}
      onClose={onClose}
      shouldCloseOnOverlayClick
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <RetroModalHeader id={id} hasCloseButton closeButtonLabel="Close">
          <ItemBrand type={type} />
        </RetroModalHeader>
        {children}
      </form>
    </ModalDialog>
  );
}
