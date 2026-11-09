import { legacyAuthPage } from "@/features/auth/server";
export const getServerSideProps = legacyAuthPage("verify-email");
export default function LegacyAccountPage() { return null; }
