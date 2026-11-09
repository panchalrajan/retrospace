import type { GetServerSidePropsContext } from "next";
import { createClient } from "@/utils/supabase/server";
export type Account = { id: string; name: string; email: string; isGuest: boolean };
export async function getAccount({ req, res }: GetServerSidePropsContext): Promise<Account | null> {
  res.setHeader("Cache-Control", "private, no-store");
  const { data: { user }, error } = await createClient(req, res).auth.getUser();
  if (error || !user) return null;
  const name = user.user_metadata?.full_name;
  return { id: user.id, isGuest: user.is_anonymous === true, email: user.email ?? "", name: typeof name === "string" && name.trim() ? name.trim().slice(0, 100) : user.email ?? "Your account" };
}
export async function guestPage(context: GetServerSidePropsContext) {
  if (await getAccount(context)) return { redirect: { destination: "/", permanent: false } };
  return { props: {} };
}

export function legacyAuthPage(mode: import("./validation").AuthMode) {
  return async (context: GetServerSidePropsContext) => {
    const { authHref } = await import("./modal-routing");
    return { redirect: { destination: authHref(mode, context.query), permanent: false } };
  };
}

export async function homePageProps(context: GetServerSidePropsContext) {
  const { authHref, getAuthMode } = await import("./modal-routing");
  const account = await getAccount(context);
  const mode = getAuthMode(context.query.auth);
  if (mode === "reset-password" && !account) return { redirect: { destination: authHref("forgot-password", { expired: "1" }), permanent: false } };
  if (account && !account.isGuest && mode && mode !== "reset-password") return { redirect: { destination: "/", permanent: false } };
  return { props: { account } };
}
