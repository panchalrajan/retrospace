import { legacyAuthPage } from "@/features/auth/server";
export const getServerSideProps = legacyAuthPage("reset-password");
export default function LegacyAccountPage() { return null; }
