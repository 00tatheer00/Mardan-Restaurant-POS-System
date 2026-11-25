import { PageHeader } from "@/components/page-header";
import { getProfile } from "@/lib/auth/session";
import { DashboardView } from "./dashboard-view";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const profile = await getProfile();
  return (
    <>
      <PageHeader title="Dashboard" description="Live sales — updates as orders sync" />
      <DashboardView owner={profile?.role === "owner"} />
    </>
  );
}
