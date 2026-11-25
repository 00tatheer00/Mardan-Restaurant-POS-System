import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth/session";
import { LocalUser } from "@/components/layout/local-user";
import { Sidebar } from "@/components/layout/sidebar";
import { PosScreen } from "./pos-screen";

export const metadata = { title: "POS" };

export default async function PosPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  return (
    <div className="flex h-dvh overflow-hidden bg-slate-50 dark:bg-background">
      <Sidebar role={profile.role} />
      <div className="min-w-0 flex-1">
        <PosScreen profile={profile} />
      </div>
      <LocalUser id={profile.id} />
    </div>
  );
}
