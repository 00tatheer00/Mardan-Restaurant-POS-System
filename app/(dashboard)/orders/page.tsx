import { PageHeader } from "@/components/page-header";
import { getProfile } from "@/lib/auth/session";
import { OrdersTable } from "./orders-table";

export const metadata = { title: "Orders" };

export default async function OrdersPage() {
  const profile = await getProfile();
  return (
    <>
      <PageHeader title="Orders" description="History, reprint and void" />
      <OrdersTable isOwner={profile?.role === "owner"} />
    </>
  );
}
