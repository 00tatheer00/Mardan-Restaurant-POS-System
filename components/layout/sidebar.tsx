"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useUI } from "@/lib/stores/ui";
import type { Role } from "@/lib/auth/roles";
import { cn } from "@/lib/utils";
import { Brand } from "./brand";
import { NavList } from "./nav-list";

export function Sidebar({ role }: { role: Role }) {
  const { collapsed, toggle } = useUI();
  return (
    <aside className={cn("hidden shrink-0 flex-col border-r bg-card print:!hidden transition-[width] duration-200 md:flex", collapsed ? "w-[72px]" : "w-60")}>
      <div className={cn("flex h-16 items-center border-b px-4", collapsed && "justify-center px-0")}>
        <Brand compact={collapsed} />
      </div>
      <TooltipProvider delayDuration={0}>
        <div className="flex-1 overflow-y-auto p-3">
          <NavList role={role} collapsed={collapsed} />
        </div>
      </TooltipProvider>
      <div className="border-t p-3">
        <Button variant="ghost" size="sm" onClick={toggle} className="w-full text-muted-foreground" aria-label="Toggle sidebar">
          {collapsed ? <PanelLeftOpen /> : <><PanelLeftClose /> Collapse</>}
        </Button>
      </div>
    </aside>
  );
}
