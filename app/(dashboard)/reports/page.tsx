import { PageHeader } from "@/components/page-header";
import { getProfile } from "@/lib/auth/session";
import { ReportsView } from "./reports-view";

export const metadata = { title: "Reports" };

export default async function ReportsPage() {
  const owner = (await getProfile())?.role === "owner";
  return (
    <>
      <PageHeader title="Reports" description={owner ? "Sales, profit & loss, items, production and expenses" : "Today's reports"} />
      <ReportsView owner={owner} />
    </>
  );
}
