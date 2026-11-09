import { useState, type FormEvent } from "react";
import Button from "@atlaskit/button/new";
import Textfield from "@atlaskit/textfield";
import type { Account } from "@/features/auth/server";
import type { InviteInfo } from "./models";
import { AppFrame, Feedback } from "./app-ui";
import { ensureGuest, command, invitationLogin } from "./service";
import { ConnectedBoard } from "./connected-board";
export function RetroPage({ account, invite }: { account: Account | null; invite: InviteInfo }) {
  const [name, setName] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  async function join(event: FormEvent) {
    event.preventDefault(); if (busy) return;
    if (!name.trim() || name.trim().length > 100) { setError("Enter your full name (up to 100 characters)."); return; }
    setBusy(true); setError("");
    try { await ensureGuest(name.trim()); await command("join", { slug: invite.invite_slug, name: name.trim() }); window.location.reload(); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to join."); setBusy(false); }
  }
  if (account) return <ConnectedBoard account={account} invite={invite} />;
  return <AppFrame account={null}><section className="join-retro-card"><span className="connected-eyebrow">YOU’RE INVITED</span><h1>{invite.title}</h1><p>{invite.allow_guests ? "Enter your name to join the conversation." : "The host requires a registered account for this retrospective."}</p>{error && <Feedback>{error}</Feedback>}{invite.allow_guests && <form className="connected-form" onSubmit={join}><label htmlFor="join-full-name">Full name<Textfield id="join-full-name" value={name} onChange={e => setName(e.currentTarget.value)} autoComplete="name" maxLength={100} isRequired isDisabled={busy} /></label><Button type="submit" appearance="primary" isLoading={busy} isDisabled={busy}>Join as guest</Button></form>}<div className="join-login-note"><p>Log in to keep this retrospective in your history.</p><Button appearance="subtle" onClick={() => invitationLogin(invite.invite_slug)}>Log in to join</Button></div></section></AppFrame>;
}
