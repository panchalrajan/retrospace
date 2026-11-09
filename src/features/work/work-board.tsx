import { useId, type ReactNode } from "react";
import Tooltip from "@atlaskit/tooltip";
import { Box, Inline, Stack, Text, xcss } from "@atlaskit/primitives";

import { UserAvatar } from "@/shared/user-avatar";
import Badge from "@atlaskit/badge";
import Button from "@atlaskit/button/button";
import IconButton from "@atlaskit/button/icon/button";
import Heading from "@atlaskit/heading";
import EmptyState from "@atlaskit/empty-state";
import AddIcon from "@atlaskit/icon/core/add";
import EditIcon from "@atlaskit/icon/core/edit";
import DeleteIcon from "@atlaskit/icon/core/delete";
import ArrowDownIcon from "@atlaskit/icon/core/arrow-down";
import ArrowUpIcon from "@atlaskit/icon/core/arrow-up";
import ArrowLeftIcon from "@atlaskit/icon/core/arrow-left";
import ArrowRightIcon from "@atlaskit/icon/core/arrow-right";
import ThumbsUpIcon from "@atlaskit/icon/core/thumbs-up";
import CommentIcon from "@atlaskit/icon/core/comment";
import PinIcon from "@atlaskit/icon/core/pin-filled";
import { VoteControl, CommentsControl, type WorkComment } from "./work-item-components";
import { useBoardScroll } from "./use-board-scroll";
import { useColumnScroll } from "./use-column-scroll";

const emptyColumnPrompts: Record<string, string> = {
  Kudos: "Celebrate a win",
  Liked: "What went well?",
  Learned: "Share a learning",
  Continue: "What should continue?",
  "Longed For": "What was missing?",
  Start: "What should we start?",
  Lacked: "Where did we fall short?",
  Stop: "What should we stop?",
};

const cardStyles = xcss({
  backgroundColor: "elevation.surface.raised",
  borderColor: "color.border",
  borderStyle: "solid",
  borderWidth: "border.width",
  borderRadius: "radius.medium",
});
const columnStyles = xcss({
  backgroundColor: "elevation.surface.sunken",
  borderColor: "color.border",
  borderStyle: "solid",
  borderWidth: "border.width",
  borderRadius: "radius.medium",
  flexBasis: "var(--board-column-width, 300px)",
  flexShrink: 0,
  flexGrow: 0,
  minWidth: "0",
  minHeight: "280px",
});
const pinnedColumnStyles = xcss({ borderColor: "color.border.selected" });
function ScrollCue({ direction, remaining, onClick, label }: {
  direction: "up" | "down" | "left" | "right"; remaining: number; onClick: () => void; label: string;
}) {
  if (remaining <= 0) return null;
  const Icon = { up: ArrowUpIcon, down: ArrowDownIcon, left: ArrowLeftIcon, right: ArrowRightIcon }[direction];
  const vertical = direction === "up" || direction === "down";
  const help = vertical
    ? `${label}. Scroll inside this column or select this button to reveal more cards.`
    : `${label}. Swipe sideways, use Shift + wheel, or select this arrow to see more columns.`;
  return <div className={`work-scroll-cue work-scroll-cue--${direction}`}>
    {vertical ? <Tooltip content={help}><Button appearance="default" spacing="compact" className="work-scroll-pill"
      iconBefore={<Icon label="" />} aria-label={label} onClick={onClick}>
      {remaining} more
    </Button></Tooltip> : <IconButton appearance="default" shape="circle" icon={Icon} label={help} onClick={onClick} />}
  </div>;
}

type WorkBoardProps = {
  children: ReactNode; actions?: ReactNode; visibleColumns?: number; minimumColumnWidth?: number; readOnly?: boolean;
};
export function WorkBoard({ readOnly = false, ...props }: WorkBoardProps) {
  if (readOnly) return <section className="work-board-preview" aria-label="Sample retrospective board"><div className="work-board-preview-grid">{props.children}</div></section>;
  return <InteractiveWorkBoard {...props} />;
}
function InteractiveWorkBoard({ children, actions, visibleColumns, minimumColumnWidth = 300 }: {
  children: ReactNode; actions?: ReactNode; visibleColumns?: number; minimumColumnWidth?: number;
}) {
  const { scrollRef, first, visible, total, scrollPage } = useBoardScroll(children, visibleColumns ?? (actions ? 3 : 4), minimumColumnWidth);
  return <section aria-label="Retro board" className={`work-board-section${actions ? " work-board-section--with-actions" : ""}`}>
    <div className={`work-board-layout${actions ? " work-board-layout--with-actions" : ""}`}>
      <div className="work-board-scroll-shell">
        <div ref={scrollRef} className="work-board" role="region" aria-label="Retro columns" tabIndex={0}>{children}</div>
        <ScrollCue direction="left" remaining={first} label={`Scroll left: ${first} more columns`} onClick={() => scrollPage(-1)} />
        <ScrollCue direction="right" remaining={total - first - visible} label={`Scroll right: ${total - first - visible} more columns`} onClick={() => scrollPage(1)} />
      </div>
      {actions && <aside className="work-board-actions" aria-label="Retro creator action items">{actions}</aside>}
    </div>

  </section>;
}

type ColumnContent = { title: string; count: number; children: ReactNode; pinned?: boolean; emptyState?: ReactNode; canCreate?: boolean };
type WorkBoardColumnProps = ColumnContent & ({ readOnly: true; onCreate?: never } | { readOnly?: false; onCreate: () => void });
export function WorkBoardColumn(props: WorkBoardColumnProps) {
  const headingId = useId();
  if (props.readOnly) return <Box as="section" xcss={columnStyles} data-preview-column data-board-column aria-labelledby={headingId}>
    <div className="work-preview-column-heading"><h3 id={headingId}>{props.title}</h3><Badge>{props.count}</Badge></div>
    <div className="work-preview-column-cards">{props.children}</div>
  </Box>;
  return <InteractiveWorkBoardColumn {...props} />;
}
function InteractiveWorkBoardColumn({ title, count, children, onCreate, pinned = false, emptyState, canCreate = true }: {
  title: string; count: number; children: ReactNode; onCreate: () => void; pinned?: boolean; emptyState?: ReactNode; canCreate?: boolean;
}) {
  const headingId = useId();
  const { scrollRef, hasOverflow, remaining, above, scrollToNext, scrollToPrevious } = useColumnScroll(children);
  return <Box as="section" aria-labelledby={headingId} data-board-column xcss={[columnStyles, pinned && pinnedColumnStyles]}>
    <div className="work-board-column-heading">
      {pinned && <Tooltip content="Pinned action items"><span className="work-board-pin"><PinIcon label="Pinned" color="var(--ds-icon-brand)" size="small" /></span></Tooltip>}
      <Heading size="small" as="h3" id={headingId}>{title}</Heading>
      <Badge>{count}</Badge>
      {canCreate && <Button appearance="subtle" spacing="compact" iconBefore={<AddIcon label="" />} aria-label={`Add to ${title}`} onClick={onCreate} />}
    </div>
    <div className="work-column-scroll-shell">
      {hasOverflow && <ScrollCue direction="up" remaining={above} label={`Scroll up: ${above} more ${title} items`} onClick={scrollToPrevious} />}
    <div ref={scrollRef} className="work-board-column-cards" role="region" aria-label={`${title} cards`} tabIndex={count > 0 ? 0 : undefined}>
      {children}
      {count === 0 && <div className="work-board-column-empty">
        {emptyState ?? <EmptyState
          header={title === "Action items" ? "Turn ideas into next steps" : (emptyColumnPrompts[title] ?? "Start the conversation")}
          headingSize="xsmall"
          width="narrow"
          description={title === "Action items" ? "Capture a clear next step with an owner and due date." : "Share a reflection to start the conversation with your team."}
          primaryAction={canCreate ? <Button appearance="primary" spacing="compact" iconBefore={<AddIcon label="" />} onClick={onCreate}>
            {title === "Action items" ? "Create action item" : "Add reflection"}
          </Button> : undefined}
        />}
      </div>}
    </div>
      {hasOverflow && <ScrollCue direction="down" remaining={remaining} label={`Scroll down: ${remaining} more ${title} items`} onClick={scrollToNext} />}
    </div>
  </Box>;
}

type CardContent = { id: string; title: string; person: string; personLabel: string; votes: string[]; comments: WorkComment[]; statusControl?: ReactNode; dueDateControl?: ReactNode };
type CardActions = { canEdit?: boolean; canVote?: boolean; voterNames?: Record<string, string>; currentUser: string; onVote: () => void; onComments: () => void; onEdit: () => void; onDelete?: () => void };
type WorkItemCardProps = CardContent & ({ readOnly: true } | ({ readOnly?: false } & CardActions));
export function WorkItemCard(props: WorkItemCardProps) {
  const headingId = useId();
  if (props.readOnly) return <Box as="article" xcss={cardStyles} data-preview-card data-work-card aria-labelledby={headingId}>
    <span className="work-preview-card-id">{props.id}</span>
    <p id={headingId} className="work-preview-card-title">{props.title}</p>
    <div className="work-preview-card-footer"><span aria-label={`${props.personLabel}: ${props.person}`}><UserAvatar name={props.person} /></span><span className="work-preview-card-metrics"><span aria-label={`${props.votes.length} votes`}><ThumbsUpIcon label="" size="small" />{props.votes.length}</span><span aria-label={`${props.comments.length} comments`}><CommentIcon label="" size="small" />{props.comments.length}</span></span></div>
  </Box>;
  return <InteractiveWorkItemCard {...props} />;
}
function InteractiveWorkItemCard({ id, title, person, personLabel,
  statusControl, dueDateControl, votes, comments, currentUser, voterNames, canEdit = true, canVote = true, onVote, onComments, onEdit, onDelete }: {
  id: string; title: string; person: string; personLabel: string; voterNames?: Record<string, string>; canEdit?: boolean; canVote?: boolean;
  statusControl?: ReactNode; dueDateControl?: ReactNode; votes: string[]; comments: WorkComment[]; currentUser: string;
  onVote: () => void; onComments: () => void; onEdit: () => void; onDelete?: () => void;
}) {
  const headingId = useId();
  return <Box as="article" aria-labelledby={headingId} data-work-card xcss={cardStyles} padding="space.150">
    <Stack space="space.150">
    <Inline alignBlock="center" spread="space-between" space="space.050">
      <Button appearance="link" spacing="none" onClick={onEdit}>{id}</Button>
      <span className="work-item-card-actions">
        {canEdit && <Button className="work-icon-action" appearance="subtle" spacing="compact" iconBefore={<EditIcon label="" size="small" />} aria-label={`Edit ${id}`} onClick={onEdit} />}
        {onDelete && <Button className="work-delete-action work-icon-action" appearance="subtle" spacing="compact" iconBefore={<DeleteIcon label="" size="small" />} aria-label={`Delete ${id}`} onClick={onDelete} />}
      </span>
    </Inline>
    <div className="work-item-card-title" title={title}>
      <Text as="span" id={headingId} weight="medium">{title}</Text>
    </div>
    {(statusControl || dueDateControl) && <div className="work-item-card-fields">{statusControl}{dueDateControl}</div>}
    <div className="work-item-card-footer">
      <Tooltip content={`${personLabel}: ${person}`}>
        <span className="work-item-card-avatar" tabIndex={0} aria-label={`${personLabel}: ${person}`}><UserAvatar name={person} /></span>
      </Tooltip>
      <div className="work-item-card-engagement">
      <VoteControl compact ticketId={id} votes={votes} currentUser={currentUser} voterNames={voterNames} isDisabled={!canVote} onToggle={onVote} />
      <CommentsControl compact ticketId={id} comments={comments} onOpen={onComments} />
      </div>
    </div>
    </Stack>
  </Box>;
}
