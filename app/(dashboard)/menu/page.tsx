import { PageHeader } from "@/components/page-header";
import { MenuManager } from "./menu-manager";

export const metadata = { title: "Menu" };

export default function MenuPage() {
  return (
    <>
      <PageHeader title="Menu" description="Categories, items, prices and recipe links" />
      <MenuManager />
    </>
  );
}
