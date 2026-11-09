import { legacyAuthPage } from "@/features/auth/server";
export const getServerSideProps = legacyAuthPage("login");
export default function LegacyAccountPage() { return null; }
