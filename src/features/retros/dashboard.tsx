import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Button from "@atlaskit/button/new";
import Textfield from "@atlaskit/textfield";
import Select from "@atlaskit/select";
import Checkbox from "@atlaskit/checkbox";
import Lozenge from "@atlaskit/lozenge";
import { WorkTable } from "@/features/work/work-item-components";
import { UserAvatar } from "@/shared/user-avatar";
import { createClient } from "@/utils/supabase/client";
import type { Account } from "@/features/auth/server";
import { AppDialog, AppFrame, Feedback, GuestBanner } from "./app-ui";
import { command, ensureGuest, finishGuestHistory, loadHistory } from "./service";
import { DURATIONS, validateCreate, type Retro } from "./models";
const durationOptions = DURATIONS.map(value => ({ value, label: value === 0 ? "No timer" : `${value} mins` }));
export function CreateRetroDialog({ account, onClose }: { account: Account | null; onClose: () => void }) {
  const [name, setName] = useState(account?.name ?? ""); const [title, setTitle] = useState("");
  const [duration, setDuration] = useState(15); const [guests, setGuests] = useState(true); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy) return;
    const invalid = validateCreate(name, title, duration); if (invalid) { setError(invalid); return; }
    setBusy(true); setError("");
    try { await ensureGuest(name); await command("create", { name: name.trim(), title: title.trim(), duration, allow_guests: guests }); window.location.assign(new URL("/?created=1", window.location.origin).href); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to create the retro."); setBusy(false); }
  }
  return <AppDialog title="Create a retrospective" busy={busy} onClose={onClose} footer={<><span className="retro-form-note">Time can be increased later.</span><Button type="submit" form="create-retro-form" appearance="primary" isLoading={busy} isDisabled={busy}>Create retro</Button></>}>
    {(!account || account.isGuest) && <GuestBanner account={account} />}{error && <Feedback>{error}</Feedback>}
    <form id="create-retro-form" onSubmit={submit} className="connected-form">
      {(!account || account.isGuest) && <label htmlFor="retro-full-name">Full name<Textfield id="retro-full-name" autoComplete="name" value={name} maxLength={100} onChange={e => setName(e.currentTarget.value)} isRequired isDisabled={busy} /></label>}
      <label htmlFor="retro-title">Sprint name<Textfield id="retro-title" value={title} maxLength={120} onChange={e => setTitle(e.currentTarget.value)} isRequired isDisabled={busy} /></label>
      <fieldset className="retro-timer-options"><legend>Timer</legend><div className="retro-timer-chips">{durationOptions.map(option => <Button key={option.value} type="button" spacing="compact" appearance={duration === option.value ? "primary" : "default"} aria-pressed={duration === option.value} onClick={() => setDuration(option.value)} isDisabled={busy}>{option.label}</Button>)}</div></fieldset>
      <div className="retro-guest-option"><Checkbox label="Allow guest login" isChecked={guests} onChange={e => setGuests(e.currentTarget.checked)} isDisabled={busy} /></div>
    </form>
  </AppDialog>;
}
export function Dashboard({ account }: { account: Account | null }) {
  const router = useRouter(); const [createOpen, setCreateOpen] = useState(router.query.create === "1");
  const [retros, setRetros] = useState<Retro[]>([]); const [loading, setLoading] = useState(Boolean(account)); const [error, setError] = useState(""); const [query, setQuery] = useState(""); const [filter, setFilter] = useState("all"); const [page, setPage] = useState(1);
  const [profileError, setProfileError] = useState(""); const [profileOpen, setProfileOpen] = useState(false); const [name, setName] = useState(account?.name ?? ""); const [profileBusy, setProfileBusy] = useState(false);
  const refresh = useCallback(async () => {
    if (!account) return;
    try { await finishGuestHistory(); setLoading(true); const rows = await loadHistory(); setRetros(rows); setError(""); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to load your history."); }
    finally { setLoading(false); }
  }, [account]);
  useEffect(() => {
    if (!account) return;
    let active = true;
    void finishGuestHistory().then(loadHistory).then(rows => { if (active) { setRetros(rows); setError(""); } }).catch(e => { if (active) setError(e instanceof Error ? e.message : "Unable to load your history."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [account]);
  async function saveProfile(event: FormEvent) {
    event.preventDefault(); if (!name.trim() || name.trim().length > 100) { setProfileError("Enter a name of up to 100 characters."); return; }
    setProfileBusy(true);
    try { await command("profile", { name: name.trim() }); const { error } = await createClient().auth.updateUser({ data: { full_name: name.trim() } }); if (error) throw error; window.location.reload(); }
    catch (e) { setProfileError(e instanceof Error ? e.message : "Unable to save profile."); setProfileBusy(false); }
  }
  const visible = retros.filter(retro => retro.title.toLowerCase().includes(query.toLowerCase()) && (filter === "all" || (filter === "hosted" ? retro.host_id === account?.id : retro.host_id !== account?.id)));
  const rows = visible.map(retro => ({ key: retro.id, cells: [
    { key: "title", content: <Link href={`/retro/${retro.invite_slug}`}>{retro.title}</Link> },
    { key: "role", content: <Lozenge appearance={retro.host_id === account?.id ? "inprogress" : "default"}>{retro.host_id === account?.id ? "Host" : "Attendee"}</Lozenge> },
    { key: "created", content: retro.created_at.slice(0, 10) },
    { key: "duration", content: retro.duration_minutes ? `${retro.duration_minutes} min` : "No timer" },
    { key: "guests", content: retro.allow_guests ? "Allowed" : "Accounts only" },
    { key: "open", content: <Link href={`/retro/${retro.invite_slug}`}>Open board →</Link> },
  ] }));
  return <AppFrame account={account}>
    <section className="dashboard-profile"><div className="dashboard-identity"><UserAvatar name={account?.name ?? "Guest"} /><div><span className="connected-eyebrow">YOUR RETROSPACE</span><h1>{account ? `${account.name}’s dashboard` : "Your next conversation starts here."}</h1><p>{account?.isGuest ? "Guest profile" : account?.email ?? "Create a retrospective, invite your team, and find your history here."}</p></div></div><div className="connected-actions">{account && <Button onClick={() => { setProfileError(""); setProfileOpen(true); }}>Edit profile</Button>}<Button appearance="primary" onClick={() => setCreateOpen(true)}>Create retro</Button></div></section>
    <GuestBanner account={account} />{router.query.created === "1" && <Feedback error={false}>Your retrospective is ready. Open it from the history table below.</Feedback>}{error && <Feedback>{error}</Feedback>}
    <section className="dashboard-history"><div className="connected-section-heading"><div><h2>Your retrospectives</h2><p>Boards you host and conversations you’ve joined.</p></div><div className="connected-actions"><Textfield aria-label="Search retrospectives" placeholder="Search retrospectives" value={query} onChange={e => { setQuery(e.currentTarget.value); setPage(1); }} /><Select inputId="history-filter" aria-label="Filter history" options={[{ value: "all", label: "All retros" }, { value: "hosted", label: "Hosted by me" }, { value: "attended", label: "Attended" }]} value={[{ value: "all", label: "All retros" }, { value: "hosted", label: "Hosted by me" }, { value: "attended", label: "Attended" }].find(o => o.value === filter)} onChange={o => { setFilter(o?.value ?? "all"); setPage(1); }} isSearchable={false} /></div></div>
      {loading ? <p role="status">Loading your retrospectives…</p> : <WorkTable label="Retrospective history" head={{ cells: [{ key: "title", content: "Retrospective", width: 36 }, { key: "role", content: "Your role", width: 12 }, { key: "created", content: "Created", width: 14 }, { key: "duration", content: "Duration", width: 12 }, { key: "guests", content: "Guests", width: 12 }, { key: "open", content: "", width: 14 }] }} rows={rows} page={page} rowsPerPage={10} totalRows={visible.length} onSetPage={setPage} emptyView={<div className="connected-empty"><h3>{query ? "No matching retrospectives" : "A fresh space for your next retro"}</h3><p>{query ? "Try a different sprint name." : "Create your first retro or open an invitation link to join your team."}</p><Button appearance="primary" onClick={() => setCreateOpen(true)}>Create retro</Button></div>} footerSummary={`${visible.length} retrospective${visible.length === 1 ? "" : "s"}`} onRefresh={() => { void refresh(); }} />}
    </section>
    {createOpen && <CreateRetroDialog account={account} onClose={() => setCreateOpen(false)} />}
    {profileOpen && <AppDialog title="Edit profile" busy={profileBusy} onClose={() => setProfileOpen(false)} footer={<Button appearance="primary" type="submit" form="profile-form" isLoading={profileBusy}>Save profile</Button>}>{profileError && <Feedback>{profileError}</Feedback>}<form id="profile-form" className="connected-form" onSubmit={saveProfile}><label htmlFor="profile-name">Full name<Textfield id="profile-name" value={name} onChange={e => setName(e.currentTarget.value)} maxLength={100} isRequired /></label></form></AppDialog>}
  </AppFrame>;
}
