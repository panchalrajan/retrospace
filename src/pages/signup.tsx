import { legacyAuthPage } from "@/features/auth/server";
export const getServerSideProps = legacyAuthPage("signup");
export default function LegacyAccountPage() { return null; }
