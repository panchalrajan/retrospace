import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { RetrospaceBrand } from "@/features/navigation/components/retrospace-brand";
import { ThemeToggle } from "@/features/navigation/components/theme-toggle";
import { ProfileAction } from "@/features/navigation/components/navigation-actions";
import { AuthButton, AuthLink } from "@/features/auth/auth-link";
import type { Account } from "@/features/auth/server";
export const AppDialog = dynamic(() => import("./dialog").then(m => m.Dialog), { ssr: false });
export function AppFrame({ account, children }: { account: Account | null; children: ReactNode }) {
  return <div className="connected-app"><header className="connected-nav"><RetrospaceBrand /><div className="connected-nav-account"><ThemeToggle />{account ? <ProfileAction /> : <AuthButton mode="login" appearance="subtle">Log in</AuthButton>}</div></header><main className="connected-main">{children}</main></div>;
}
export function GuestBanner({ account }: { account: Account | null }) {
  if (account && !account.isGuest) return null;
  return <aside className="guest-history-banner"><span>{account ? "You’re using a guest session." : "You can create a retro without an account."} Your history stays with this browser until you link an account.</span><AuthLink mode="login">Log in to keep your history</AuthLink><AuthLink mode="signup">Create an account</AuthLink></aside>;
}
export function Feedback({ children, error = true }: { children: ReactNode; error?: boolean }) { return <p className={`retro-feedback${error ? " retro-feedback--error" : ""}`} role={error ? "alert" : "status"}>{children}</p>; }
