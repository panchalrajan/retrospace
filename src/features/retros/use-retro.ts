import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { command, loadSnapshot } from "./service";
import type { Snapshot } from "./models";
export function useRetro(slug: string, userId: string) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState("");
  const [connection, setConnection] = useState("Connecting");
  const [online, setOnline] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const disposed = useRef(false);
  const inFlight = useRef<Promise<void> | null>(null);
  const fetchAgain = useRef(false);
  const refresh = useCallback(function requestRefresh(): Promise<void> {
    if (inFlight.current) { fetchAgain.current = true; return inFlight.current; }
    const request = (async () => {
      try { const next = await loadSnapshot(slug); if (!disposed.current) { setSnapshot(next); setError(""); } }
      catch (e) { if (!disposed.current) setError(e instanceof Error ? e.message : "Unable to refresh the board."); }
    })().finally(() => { inFlight.current = null; if (fetchAgain.current && !disposed.current) { fetchAgain.current = false; void requestRefresh(); } });
    inFlight.current = request; return request;
  }, [slug]);
  useEffect(() => {
    disposed.current = false;
    void (async () => { try { await command("join", { slug }); await refresh(); } catch (e) { if (!disposed.current) setError(e instanceof Error ? e.message : "Unable to join."); } })();
    return () => { disposed.current = true; };
  }, [slug, refresh]);
  const retroId = snapshot?.retro.id;
  useEffect(() => {
    if (!retroId) return;
    const client = createClient(); let cancelled = false; let connected = false; let debounce: ReturnType<typeof setTimeout> | undefined;
    const invalidate = () => { if (debounce) clearTimeout(debounce); debounce = setTimeout(() => { void refresh(); }, 150); };
    const channel = client.channel(`retro:${retroId}`, { config: { private: true, presence: { key: userId } } })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "retros", filter: `id=eq.${retroId}` }, invalidate)
      .on("presence", { event: "sync" }, () => { if (!cancelled) setOnline(Object.keys(channel.presenceState())); });
    void client.realtime.setAuth().then(() => { if (cancelled) return; channel.subscribe(status => {
      if (cancelled) return;
      connected = status === "SUBSCRIBED";
      setConnection(connected ? "Live" : status === "CHANNEL_ERROR" || status === "TIMED_OUT" ? "Reconnecting" : "Connecting");
      if (connected) { void channel.track({ user_id: userId }); void refresh(); }
    }); });
    const fallback = setInterval(() => { if (!connected && document.visibilityState === "visible") void refresh(); }, 15000);
    const focus = () => { if (document.visibilityState === "visible") void refresh(); };
    window.addEventListener("focus", focus); document.addEventListener("visibilitychange", focus);
    return () => { cancelled = true; clearInterval(fallback); if (debounce) clearTimeout(debounce); window.removeEventListener("focus", focus); document.removeEventListener("visibilitychange", focus); void client.removeChannel(channel); };
  }, [retroId, refresh, userId]);
  async function mutate(action: string, payload: Record<string, unknown> = {}) {
    setBusy(true);
    try { const result = await command(action, { ...payload, slug }); await refresh(); return result; }
    catch (e) { const message = e instanceof Error ? e.message : "Unable to save. Please try again."; setError(message); throw new Error(message); }
    finally { setBusy(false); }
  }
  return { snapshot, error, setError, connection, online, busy, refresh, mutate };
}
