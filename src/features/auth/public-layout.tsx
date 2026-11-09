import type { ReactNode } from "react";
import Head from "next/head";
import dynamic from "next/dynamic";
import { SectionLink } from "./section-link";
import { RetrospaceBrand } from "@/features/navigation/components/retrospace-brand";
import { ThemeToggle } from "@/features/navigation/components/theme-toggle";
import { AuthButton, AuthLink } from "./auth-link";
// Atlaskit dialogs use browser portals and focus locks. Keep that subtree
// out of SSR so portal structure cannot differ during initial hydration.
const AuthModal = dynamic(() => import("./auth-modal").then(module => module.AuthModal), { ssr: false });

export function PublicNavbar() {
  return <header className="public-navbar"><RetrospaceBrand />
    <nav className="public-page-navigation" aria-label="Explore Retrospace"><SectionLink id="how-it-works">How it works</SectionLink><SectionLink id="workspace">The workspace</SectionLink><SectionLink id="features">Features</SectionLink><SectionLink id="questions">FAQs</SectionLink></nav>
    <nav className="public-account-navigation" aria-label="Account"><ThemeToggle /><span data-auth-login><AuthButton mode="login" appearance="subtle">Log in</AuthButton></span><AuthButton>Get started</AuthButton></nav>
  </header>;
}

function PublicFooter() {
  return <footer className="public-footer"><div className="public-footer-main"><div className="public-footer-brand"><RetrospaceBrand /><p>A little reflection.<br />A better way forward.</p></div><nav aria-label="Product"><span>EXPLORE</span><SectionLink id="how-it-works">How it works</SectionLink><SectionLink id="workspace">The workspace</SectionLink><SectionLink id="features">Features</SectionLink><SectionLink id="questions">FAQs</SectionLink></nav><nav aria-label="Your account"><span>YOUR SPACE</span><AuthLink mode="signup">Create an account</AuthLink><AuthLink mode="login">Log in</AuthLink><AuthLink mode="forgot-password">Reset password</AuthLink></nav><div className="public-footer-signoff"><span className="public-footer-spark" aria-hidden="true">✳</span><p>Good teams keep learning.<br />Give yours a space to grow.</p></div></div><div className="public-footer-bottom"><span>© {new Date().getFullYear()} Retrospace</span><span>Built around better conversations.</span><SectionLink id="">Back to top ↑</SectionLink></div></footer>;
}

export function PublicLayout({ title, children }: { title: string; children: ReactNode }) {
  return <><Head><title>{`${title} · Retrospace`}</title><meta name="description" content="A thoughtful space for team retrospectives. Bring ideas together, focus the conversation, and make room for a better next sprint." /></Head><div className="public-shell"><PublicNavbar />{children}<PublicFooter /></div><AuthModal /></>;
}
