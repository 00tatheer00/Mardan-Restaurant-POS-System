import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth/session";
import { PosScreen } from "./pos-screen";

export const metadata = { title: "POS" };

export default async function PosPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  return (
    <div className="h-dvh overflow-hidden bg-slate-50 dark:bg-background">
      <PosScreen profile={profile} />
    </div>
  );
}
