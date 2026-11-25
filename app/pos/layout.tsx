import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth/session";

export default async function PosLayout({ children }: { children: React.ReactNode }) {
  if (!(await getProfile())) redirect("/login");
  return children;
}
