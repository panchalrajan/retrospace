import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { getBoardColumnWidth } from "./board-layout";

export function useBoardScroll(content: ReactNode, visibleColumns: number, minimumColumnWidth = 300) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const stepRef = useRef(1);
  const [range, setRange] = useState({ first: 0, visible: 0, total: 0 });
  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    const update = () => {
      const style = window.getComputedStyle(element);
      const gap = Number.parseFloat(style.columnGap) || 0;
      const total = element.children.length;
      const visible = Math.min(total, Math.max(1, Math.round((element.clientWidth + gap) / stepRef.current)));
      const first = Math.min(Math.max(0, total - visible), Math.max(0, Math.round(element.scrollLeft / stepRef.current)));
      setRange((current) => current.first === first && current.visible === visible && current.total === total ? current : { first, visible, total });
    };
    const resize = () => {
      const style = window.getComputedStyle(element);
      const gap = Number.parseFloat(style.columnGap) || 0;
      const width = element.clientWidth - (Number.parseFloat(style.paddingLeft) || 0) - (Number.parseFloat(style.paddingRight) || 0);
      const index = Math.round(element.scrollLeft / stepRef.current);
      const columnWidth = getBoardColumnWidth(width, gap, visibleColumns, minimumColumnWidth);
      element.style.setProperty("--board-column-width", `${columnWidth}px`);
      stepRef.current = columnWidth + gap;
      element.scrollLeft = index * stepRef.current;
      update();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    element.addEventListener("scroll", update, { passive: true });
    return () => { observer.disconnect(); element.removeEventListener("scroll", update); };
  }, [content, visibleColumns, minimumColumnWidth]);

  function scrollPage(direction: -1 | 1) {
    scrollRef.current?.scrollTo({
      left: (range.first + direction * range.visible) * stepRef.current,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
  }
  return { scrollRef, ...range, scrollPage };
}
