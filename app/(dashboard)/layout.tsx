import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth/session";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  return (
    <div className="flex h-dvh bg-slate-50 dark:bg-background print:block print:h-auto print:bg-white">
      <Sidebar role={profile.role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar profile={profile} />
        <main className="flex-1 overflow-y-auto p-4 pb-24 md:p-6 print:overflow-visible print:p-0">{children}</main>
      </div>
      <MobileNav role={profile.role} />
    </div>
  );
}
