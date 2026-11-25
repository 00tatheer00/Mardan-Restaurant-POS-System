"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActive, navFor } from "@/lib/nav";
import type { Role } from "@/lib/auth/roles";
import { cn } from "@/lib/utils";

export function MobileNav({ role }: { role: Role }) {
  const path = usePathname();
  const all = navFor(role).flatMap((g) => g.items);
  const items = all.filter((i) => i.mobile);
  if (!items.length) return null;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t print:hidden bg-card/95 backdrop-blur md:hidden">
      {items.map(({ href, label, icon: Icon }) => {
        const active = isActive(href, path, all);
        return (
          <Link key={href} href={href} className={cn("flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium", active ? "text-primary" : "text-muted-foreground")}>
            <span className={cn("flex size-8 items-center justify-center rounded-full", active && "bg-brand text-white")}>
              <Icon className="size-4" />
            </span>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
