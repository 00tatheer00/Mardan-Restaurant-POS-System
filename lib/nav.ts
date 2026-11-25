import {
  BarChart3, Beef, ClipboardCheck, LayoutDashboard, Monitor, Package, Receipt, Settings,
  ShoppingCart, Truck, Users, UtensilsCrossed, Wallet, WalletCards,
  type LucideIcon,
} from "lucide-react";
import { canAccess, type Role } from "@/lib/auth/roles";

export type NavItem = { href: string; label: string; icon: LucideIcon; mobile?: boolean };
export type NavGroup = { label: string; items: NavItem[] };

const NAV: NavGroup[] = [
  {
    label: "Main",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, mobile: true },
      { href: "/pos", label: "POS", icon: Monitor },
      { href: "/orders", label: "Orders", icon: Receipt, mobile: true },
      { href: "/menu", label: "Menu", icon: UtensilsCrossed },
    ],
  },
  {
    label: "Stock & Production",
    items: [
      { href: "/stock/purchases", label: "Purchases", icon: ShoppingCart },
      { href: "/stock/raw-items", label: "Raw Items", icon: Package },
      { href: "/stock/suppliers", label: "Suppliers", icon: Truck },
      { href: "/production", label: "Production", icon: Beef },
      { href: "/production/closing", label: "Day Closing", icon: ClipboardCheck },
    ],
  },
  {
    label: "Finance",
    items: [
      { href: "/expenses", label: "Expenses", icon: Wallet, mobile: true },
      { href: "/staff", label: "Staff", icon: Users },
      { href: "/staff/salary", label: "Salary", icon: WalletCards },
      { href: "/reports", label: "Reports", icon: BarChart3, mobile: true },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export const navFor = (role: Role) =>
  NAV.map((g) => ({ ...g, items: g.items.filter((i) => canAccess(role, i.href)) })).filter((g) => g.items.length);

export const isActive = (href: string, path: string, all: NavItem[]) => {
  if (path !== href && !path.startsWith(href + "/")) return false;
  return !all.some((i) => i.href.length > href.length && i.href.startsWith(href + "/") && (path === i.href || path.startsWith(i.href + "/")));
};
