"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { isActive, navFor } from "@/lib/nav";
import type { Role } from "@/lib/auth/roles";
import { cn } from "@/lib/utils";

export function NavList({ role, collapsed = false, onNavigate }: { role: Role; collapsed?: boolean; onNavigate?: () => void }) {
  const path = usePathname();
  const groups = navFor(role);
  const all = groups.flatMap((g) => g.items);

  return (
    <nav className="space-y-5">
      {groups.map((g) => (
        <div key={g.label} className="space-y-1">
          {!collapsed && <p className="px-3 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">{g.label}</p>}
          {g.items.map(({ href, label, icon: Icon }) => {
            const active = isActive(href, path, all);
            const link = (
              <Link
                key={href}
                href={href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                  collapsed && "justify-center px-0",
                  active ? "bg-brand text-white shadow-md shadow-orange-500/20" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <Icon className="size-[18px] shrink-0" />
                {!collapsed && label}
              </Link>
            );
            return collapsed ? (
              <Tooltip key={href}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right">{label}</TooltipContent>
              </Tooltip>
            ) : (
              link
            );
          })}
        </div>
      ))}
    </nav>
  );
}
