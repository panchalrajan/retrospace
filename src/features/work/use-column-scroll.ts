import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

export function getItemsBelow(cardBottoms: number[], visibleBottom: number): number {
  return cardBottoms.filter((bottom) => bottom > visibleBottom + 2).length;
}

export function getItemsAbove(cardTops: number[], visibleTop: number): number {
  return cardTops.filter((top) => top < visibleTop - 2).length;
}

export function useColumnScroll(content: ReactNode) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState({ hasOverflow: false, remaining: 0, above: 0 });
  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    const cards = Array.from(element.children).filter((child) => child.hasAttribute("data-work-card"));
    const update = () => {
      const visibleBottom = element.getBoundingClientRect().top + element.clientHeight;
      const next = {
        hasOverflow: cards.length > 0 && element.scrollHeight > element.clientHeight + 2,
        above: getItemsAbove(cards.map((card) => card.getBoundingClientRect().top), element.getBoundingClientRect().top),
        remaining: getItemsBelow(cards.map((card) => card.getBoundingClientRect().bottom), visibleBottom),
      };
      setOverflow((current) => current.hasOverflow === next.hasOverflow && current.remaining === next.remaining && current.above === next.above ? current : next);
    };
    update();
    element.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(element);
    cards.forEach((card) => observer.observe(card));
    return () => {
      element.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [content]);

  function scrollToNext() {
    const element = scrollRef.current;
    if (!element) return;
    const bounds = element.getBoundingClientRect();
    const nextCard = Array.from(element.children).find((child) => child.hasAttribute("data-work-card") && child.getBoundingClientRect().bottom > bounds.top + element.clientHeight + 2);
    if (!nextCard) return;
    const top = nextCard.getBoundingClientRect().top - bounds.top + element.scrollTop;
    element.scrollTo({ top, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }

  function scrollToPrevious() {
    const element = scrollRef.current;
    if (!element) return;
    const bounds = element.getBoundingClientRect();
    const previousCard = Array.from(element.children).filter((child) => child.hasAttribute("data-work-card") && child.getBoundingClientRect().top < bounds.top - 2).at(-1);
    if (!previousCard) return;
    element.scrollTo({ top: previousCard.getBoundingClientRect().top - bounds.top + element.scrollTop,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }
  return { scrollRef, ...overflow, scrollToNext, scrollToPrevious };
}
