import Link from "next/link";
import { useRouter } from "next/router";
import type { ReactNode } from "react";

/** Scroll within the public homepage while preserving Next's history handling. */
export function SectionLink({ id, children, className }: { id: string; children: ReactNode; className?: string }) {
  const router = useRouter();
  const href = `/#${id}`;
  return <Link href={href} className={className} onClick={async event => {
    if (router.pathname !== "/" || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const target = id ? document.getElementById(id) : document.documentElement;
    if (!target) return;
    event.preventDefault();
    await router.push(href, undefined, { shallow: true, scroll: false });
    target.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }}>{children}</Link>;
}
