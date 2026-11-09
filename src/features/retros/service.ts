import { createClient } from "@/utils/supabase/client";
import { object, parseRetro, parseSnapshot } from "./models";
export async function command(action: string, payload: Record<string, unknown> = {}) {
  const { data, error } = await createClient().rpc("retro_command", { action, payload });
  if (error) throw new Error(error.message);
  return object(data);
}
export async function loadHistory() {
  const { data, error } = await createClient().from("retros").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(parseRetro);
}
export async function loadSnapshot(slug: string) {
  const { data, error } = await createClient().rpc("retro_snapshot", { slug });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("You no longer have access to this retrospective.");
  return parseSnapshot(data);
}
export async function ensureGuest(name: string) {
  const client = createClient();
  const { data: { user } } = await client.auth.getUser();
  if (user) {
    if (user.is_anonymous && user.user_metadata.full_name !== name.trim()) {
      const { error } = await client.auth.updateUser({ data: { full_name: name.trim() } });
      if (error) throw new Error(error.message);
    }
    return user;
  }
  const { data, error } = await client.auth.signInAnonymously({ options: { data: { full_name: name.trim() } } });
  if (error || !data.user) throw new Error(error?.code === "anonymous_provider_disabled" ? "Guest access is not enabled yet. Please log in or try again shortly." : error?.message ?? "Unable to start a guest session.");
  return data.user;
}
const MERGE_KEY = "retrospace.guest-history-proof.v1";
export async function prepareGuestHistory() {
  const { data: { user } } = await createClient().auth.getUser();
  if (!user?.is_anonymous) return;
  const result = await command("prepare_guest_merge");
  if (typeof result.token === "string") sessionStorage.setItem(MERGE_KEY, result.token);
}
let mergePromise: Promise<void> | null = null;
export function finishGuestHistory(): Promise<void> {
  if (mergePromise) return mergePromise;
  mergePromise = (async () => {
    const token = sessionStorage.getItem(MERGE_KEY); if (!token) return;
    const { data: { user } } = await createClient().auth.getUser(); if (!user || user.is_anonymous) return;
    try { await command("merge_guest", { token }); }
    catch (error) { sessionStorage.removeItem(MERGE_KEY); throw error; }
    sessionStorage.removeItem(MERGE_KEY);
  })().finally(() => { mergePromise = null; });
  return mergePromise;
}
export function loginDestination() {
  const slug = sessionStorage.getItem("retrospace.pending-invite");
  sessionStorage.removeItem("retrospace.pending-invite");
  return slug && /^[a-f0-9]{32}$/.test(slug) ? `/retro/${slug}` : "/";
}

export function invitationLogin(slug: string) {
  sessionStorage.setItem("retrospace.pending-invite", slug);
  window.location.assign(new URL("/?auth=login", window.location.origin).href);
}
