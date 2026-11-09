import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { createClient } from "@/utils/supabase/client";
import type { Account } from "./server";
import { setWorkStorageAccount } from "@/shared/design-system/debug-settings";
const AccountContext = createContext<Account | null>(null);
export function useAccount() { return useContext(AccountContext); }
export function AccountProvider({ account, children }: { account: Account; children: ReactNode }) {
  const [active, setActive] = useState(true);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setWorkStorageAccount(account.id);
    const client = createClient();
    const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || (event === "INITIAL_SESSION" && !session) || (session && session.user.id !== account.id)) {
        setActive(false); window.location.replace("/");
      } else if (session?.user.id === account.id) { setReady(true); }
    });
    const verify = async () => { const { data: { user } } = await client.auth.getUser(); if (!user || user.id !== account.id) { setActive(false); window.location.replace("/"); } };
    window.addEventListener("focus", verify);
    window.addEventListener("pageshow", verify);
    return () => { subscription.unsubscribe(); setWorkStorageAccount(null); window.removeEventListener("focus", verify); window.removeEventListener("pageshow", verify); };
  }, [account.id]);
  return <AccountContext.Provider value={account}>{active && ready ? children : <p role="status">Loading your workspace…</p>}</AccountContext.Provider>;
}
