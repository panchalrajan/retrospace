import Head from "next/head";
import { useRouter } from "next/router";
import { getAuthMode } from "@/features/auth/modal-routing";
import { Homepage } from "@/features/auth/homepage";
import { AccountProvider } from "@/features/auth/session";
import type { Account } from "@/features/auth/server";
import { Dashboard } from "@/features/retros/dashboard";
export { homePageProps as getServerSideProps } from "@/features/auth/server";
export default function HomePage({ account }: { account: Account | null }) {
  const { query } = useRouter();
  const mode = getAuthMode(query.auth);
  const dashboard = query.create === "1" || Boolean(account && (!mode || (!account.isGuest && mode !== "reset-password")));
  if (!dashboard) return <Homepage />;
  const content = <Dashboard account={account} />;
  return <><Head><title>Your dashboard · Retrospace</title></Head>{account ? <AccountProvider account={account}>{content}</AccountProvider> : content}</>;
}
