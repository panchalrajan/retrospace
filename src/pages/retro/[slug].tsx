import Head from "next/head";
import type { GetServerSidePropsContext } from "next";
import { getAccount, type Account } from "@/features/auth/server";
import { AccountProvider } from "@/features/auth/session";
import { createClient } from "@/utils/supabase/server";
import { RetroPage } from "@/features/retros/retro-page";
import { object, type InviteInfo } from "@/features/retros/models";
export async function getServerSideProps(context: GetServerSidePropsContext) {
  const slug = context.params?.slug;
  if (typeof slug !== "string" || !/^[a-f0-9]{32}$/.test(slug)) return { notFound: true };
  const account = await getAccount(context);
  const { data, error } = await createClient(context.req, context.res).rpc("retro_invite_info", { slug });
  if (error || !data) return { notFound: true };
  const row = object(data);
  if (typeof row.title !== "string" || typeof row.allow_guests !== "boolean") return { notFound: true };
  return { props: { account, invite: { title: row.title, invite_slug: slug, allow_guests: row.allow_guests } } };
}
export default function Page({ account, invite }: { account: Account | null; invite: InviteInfo }) {
  const content = <RetroPage key={invite.invite_slug} account={account} invite={invite} />;
  return <><Head><title>{`${invite.title} · Retrospace`}</title></Head>{account ? <AccountProvider account={account}>{content}</AccountProvider> : content}</>;
}
