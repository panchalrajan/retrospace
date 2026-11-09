import type { GetServerSidePropsContext } from "next";
export function getServerSideProps({ query, res }: GetServerSidePropsContext) {
  res.setHeader("Cache-Control", "private, no-store");
  const params = new URLSearchParams();
  for (const key of ["create", "created"]) if (query[key] === "1") params.set(key, "1");
  return { redirect: { destination: params.size ? `/?${params}` : "/", permanent: false } };
}
export default function LegacyDashboard() { return null; }
