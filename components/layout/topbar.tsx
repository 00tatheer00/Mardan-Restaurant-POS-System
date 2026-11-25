"use client";

import { useState } from "react";
import { LogOut, Menu } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { signOut } from "@/app/(auth)/login/actions";
import { ROLE_LABEL } from "@/lib/auth/roles";
import type { Profile } from "@/types";
import { Brand } from "./brand";
import { Clock } from "./clock";
import { NavList } from "./nav-list";
import { SyncPill } from "./sync-pill";
import { ThemeToggle } from "./theme-toggle";

export function Topbar({ profile }: { profile: Profile }) {
  const [open, setOpen] = useState(false);
  const initials = profile.full_name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b print:hidden bg-card/80 px-4 backdrop-blur md:px-6">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu"><Menu /></Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <SheetHeader className="border-b"><SheetTitle><Brand /></SheetTitle></SheetHeader>
          <div className="overflow-y-auto p-3"><NavList role={profile.role} onNavigate={() => setOpen(false)} /></div>
        </SheetContent>
      </Sheet>

      <Clock />
      <div className="ml-auto flex items-center gap-2">
        <SyncPill />
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-10 gap-2 px-2">
              <Avatar className="size-8"><AvatarFallback className="bg-brand text-xs text-white">{initials}</AvatarFallback></Avatar>
              <div className="hidden text-left leading-tight lg:block">
                <p className="text-sm font-medium">{profile.full_name}</p>
                <p className="text-xs text-muted-foreground">{ROLE_LABEL[profile.role]}</p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>{profile.full_name}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => signOut()}>
              <LogOut /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
