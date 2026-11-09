import Link from "next/link";
import { useRouter } from "next/router";
import LinkButton from "@atlaskit/button/link";
import type { ReactNode } from "react";
import type { AuthMode } from "./validation";
import { authHref } from "./modal-routing";
export function AuthLink({ mode, children, className, isDisabled = false }: { mode: AuthMode; children: ReactNode; className?: string; isDisabled?: boolean }) {
  const router = useRouter();
  return <Link href={authHref(mode)} shallow={router.pathname === "/"} scroll={false} className={className} aria-disabled={isDisabled || undefined} onClick={event => { if (isDisabled) event.preventDefault(); }}>{children}</Link>;
}

/** An Atlaskit CTA that keeps account navigation in the root modal. */
export function AuthButton({ mode = "signup", children, appearance = "primary", large = false }: {
  mode?: AuthMode; children: ReactNode; appearance?: "primary" | "default" | "subtle"; large?: boolean;
}) {
  const router = useRouter();
  return <span className={large ? "public-cta public-cta--large" : "public-cta"}>
    <LinkButton href={authHref(mode)} appearance={appearance} onClick={event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      void router.push(authHref(mode), undefined, { shallow: router.pathname === "/", scroll: false });
    }}>{children}</LinkButton>
  </span>;
}
