import { legacyAuthPage } from "@/features/auth/server";
export const getServerSideProps = legacyAuthPage("forgot-password");
export default function LegacyAccountPage() { return null; }
