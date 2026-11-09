import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import { draggable, dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import DragHandleHorizontalIcon from "@atlaskit/icon/core/drag-handle-horizontal";

type MoveItem<T extends string> = (item: T, target: T, after: boolean) => void;

export function ReorderableTable<T extends string>({ items, renderItem, onMove }: {
  items: readonly T[];
  renderItem: (item: T) => ReactNode;
  onMove: MoveItem<T>;
}) {
  const listId = useId();
  const [announcement, setAnnouncement] = useState("");
  function move(item: T, target: T, after: boolean) {
    onMove(item, target, after);
    setAnnouncement(`${item} moved ${after ? "after" : "before"} ${target}.`);
  }
  return (
    <>
      <div className="reorderable-table-scroll">
      <table className="reorderable-table" aria-label="Order retro events"><tbody>
        {items.map((item, index) => (
          <ReorderableItem key={item} item={item} listId={listId} onMove={move}
            onKeyboardMove={(direction) => {
              const target = items[index + direction];
              if (target !== undefined) move(item, target, direction === 1);
            }}>
            {renderItem(item)}
          </ReorderableItem>
        ))}
      </tbody></table>
      </div>
      <span className="visually-hidden" role="status" aria-live="polite">{announcement}</span>
    </>
  );
}

function ReorderableItem<T extends string>({ item, listId, onMove, onKeyboardMove, children }: {
  item: T;
  listId: string;
  onMove: MoveItem<T>;
  onKeyboardMove: (direction: -1 | 1) => void;
  children: ReactNode;
}) {
  const elementRef = useRef<HTMLTableRowElement>(null);
  const handleRef = useRef<HTMLButtonElement>(null);
  const [dragging, setDragging] = useState(false);
  const [edge, setEdge] = useState<"top" | "bottom" | null>(null);
  useEffect(() => {
    const element = elementRef.current;
    const dragHandle = handleRef.current;
    if (!element || !dragHandle) return;
    return combine(
      draggable({ element, dragHandle, getInitialData: () => ({ item, listId }),
        onDragStart: () => setDragging(true), onDrop: () => setDragging(false) }),
      dropTargetForElements({ element,
        canDrop: ({ source }) => source.data.listId === listId && source.data.item !== item,
        onDrag: ({ location }) => {
          const bounds = element.getBoundingClientRect();
          setEdge(location.current.input.clientY < bounds.top + bounds.height / 2 ? "top" : "bottom");
        },
        onDragLeave: () => setEdge(null),
        onDrop: ({ source, location }) => {
          setEdge(null);
          if (typeof source.data.item !== "string") return;
          const bounds = element.getBoundingClientRect();
          onMove(source.data.item as T, item, location.current.input.clientY >= bounds.top + bounds.height / 2);
        },
      }),
    );
  }, [item, listId, onMove]);
  return (
    <tr ref={elementRef} className={`reorderable-table-row${dragging ? " is-dragging" : ""}`} data-drop-edge={edge ?? undefined}>
      <td className="reorderable-table-handle">
      <button ref={handleRef} className="reorderable-list-grip" type="button"
        aria-label={`Reorder ${item}. Use arrow up or arrow down to move.`}
        onKeyDown={(event) => {
          if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
          event.preventDefault();
          onKeyboardMove(event.key === "ArrowUp" ? -1 : 1);
        }}>
        <DragHandleHorizontalIcon label="" />
      </button>
      </td>
      <td>{children}</td>
    </tr>
  );
}
